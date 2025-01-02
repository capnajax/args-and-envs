'use strict';
import process from 'node:process';
import { isSymbolObject } from 'node:util/types';
export const TRUTHY_STRINGS = [
    'true', 'yes', 'y', 'on', // english
    '1', 'high', 'h', // electronics
    'da', 'ja', 'oui', 'si', 'sí'
]; // other languages
export const FALSEY_STRINGS = [
    'false', 'no', 'n', 'off', // english
    '0', 'low', 'l', // electronics
    'nyet', 'niet', 'geen', 'nein', 'non'
]; // other languages
export const next = Symbol('next');
export function argTypeName(name) {
    switch (name) {
        case 'boolean':
        case 'integer':
        case 'string':
        case 'list':
            return name;
        default:
            throw new Error(`Unknown argument type "${name}"`);
    }
}
export const stringArg = argTypeName('string');
export const booleanArg = argTypeName('boolean');
export const integerArg = argTypeName('integer');
export const listArg = argTypeName('list');
export class Parser {
    errorValues = null;
    /**
     * If the command line has ever been parsed, this will be true.
     */
    isParsed = false;
    /**
     * If new options have been added since the last time the command line was
     * parsed, this will be true.
     */
    hasNewOptions = true;
    /**
     * These are the options that have been added to the parser. Note that these
     * map option names to an array of `OptionsDef` because it is possible to
     * override an option. Only the first option in the array (last added) will
     * be used for parsing the command line, but all the handlers and validators
     * will be called in order for each option, unlesss one of the handlers or
     * validators returns a `stop` value of `true`.
     */
    options = {};
    optionSequence = [];
    parserOptions = {
        argv: process.argv.slice(2),
        env: process.env,
        global: 'argv',
        falsey: FALSEY_STRINGS,
        truthy: TRUTHY_STRINGS,
        unknown: 'error'
    };
    /**
     * These are the values from the command line before they've been handled
     * or validated but after they've been normalized to their type.
     */
    normalizedValues = null;
    /**
     * These are the values as parsed. It will be empty until the command line
     * has been parsed for the first time.
     */
    values = {};
    constructor(parserOptions, ...optionsDef) {
        this.parserOptions = Object.assign(this.parserOptions, parserOptions);
        this.addOptions(...optionsDef);
    }
    get args() {
        return this.values;
    }
    get errors() {
        return this.errorValues;
    }
    /**
     * Add an option to the options set.
     * @param option The option to add.
     * @param reparseIfNecessary normally, if the command line has already been
     *  parsed, this method will reparse it to ensure it is up to date. Set this
     *  to `false` to prevent that. Generally this should only be used internally
     *  or when adding many options separately.
     */
    addOption(option, reparseIfNecessary = true) {
        this.options[option.name] ||= [];
        this.options[option.name].push(...this.normalizeOptionDef(option));
        this.optionSequence.push(option.name);
        this.hasNewOptions = true;
        if (reparseIfNecessary) {
            this.reparseIfNecessary();
        }
    }
    /**
     * Adds one or more options to the options set. Can accept any number of
     * arguments, each of which can be a single `OptionsDef` or an array of
     * `OptionsDef`.
     * @param optionDefSet
     */
    addOptions(...optionDefSet) {
        for (const ods of optionDefSet) {
            if (Array.isArray(ods)) {
                for (const od of ods) {
                    this.addOption(od, false);
                }
            }
            else {
                this.addOption(ods, false);
            }
        }
        this.reparseIfNecessary();
    }
    freezeValues() {
        for (const key of Object.keys(this.values)) {
            if (typeof this.values[key] === 'object') {
                Object.freeze(this.values[key]);
            }
        }
        Object.freeze(this.values);
        Object.freeze(this.errorValues);
    }
    handleOptionValues() {
        const optionsSeen = new Set();
        if (!this.normalizedValues) {
            // just a typeguard -- should be impossible
            throw new Error('Cannot handle option values before normalizing.');
        }
        for (const optionName of this.optionSequence) {
            if (optionsSeen.has(optionName)) {
                continue;
            }
            else {
                optionsSeen.add(optionName);
            }
            handlerSequence: for (const optionDef of this.options[optionName].concat(this.normalizeOptionDef({ name: optionName,
                handler: [
                    (name, value) => ({ value, next: false })
                ]
            }))) {
                if (optionDef.handler) {
                    const handlers = (Array.isArray(optionDef.handler)
                        ? optionDef.handler
                        : [optionDef.handler]);
                    let lastResult = this.normalizedValues[optionDef.name];
                    for (const handler of handlers) {
                        const handlerReturn = handler(optionDef.name, lastResult, this.normalizedValues);
                        if (handlerReturn === next) {
                            continue;
                        }
                        else if (isSymbolObject(handlerReturn)) {
                            this.errorValues ||= {};
                            this.errorValues[optionDef.name] =
                                `Unknown handler return symbol for option "${optionDef.name}": ${handlerReturn.toString()}`;
                            break handlerSequence;
                        }
                        else {
                            lastResult = handlerReturn.value;
                            if (!handlerReturn.next) {
                                this.values[optionDef.name] = lastResult;
                                break handlerSequence;
                            }
                        }
                    }
                }
            }
        }
    }
    hasError(optionName) {
        return !!(this.errorValues && Object.hasOwn(this.errorValues, optionName));
    }
    hasErrors() {
        return !!(this.errorValues && Object.keys(this.errorValues).length > 0);
    }
    normalizeOptionDef(def) {
        if (Array.isArray(def)) {
            return def.map(d => this.normalizeOptionDef(d)).flat();
        }
        else {
            return [Object.assign({
                    arg: [],
                    default: undefined,
                    description: undefined,
                    env: [],
                    handler: [],
                    required: false,
                    silent: false,
                    type: stringArg,
                    validator: []
                }, def)];
        }
    }
    /**
     * Get the value of the options before they have been normalized or validated.
     */
    normalizeOptionValues() {
        this.errorValues = null;
        this.normalizedValues = {};
        // first scan the command line arguments
        if (this.parserOptions.argv?.length) {
            for (let argIdx = 0; argIdx < this.parserOptions.argv?.length; argIdx++) {
                const arg = this.parserOptions.argv[argIdx];
                let argSwitch = arg.replace(/=.*/, '');
                // FIXME -- this is not right -- I need to iterate through the options
                // and find the one that matches the switch, but also check for the
                // that I am not hitting an option that has been overridden.
                for (const optionName of Object.keys(this.options)) {
                    if (this.options[optionName]?.length &&
                        this.options[optionName][0].arg?.includes(argSwitch)) {
                        const optionDef = this.options[optionName][0];
                        let value = (arg === argSwitch
                            ? (optionDef.type === 'boolean'
                                ? true
                                : this.parserOptions.argv[++argIdx])
                            : arg.replace(/.*=/, ''));
                        if (optionDef.type === 'list') {
                            if (this.normalizedValues[optionName]) {
                                this.normalizedValues[optionName]
                                    .push(value);
                            }
                            else {
                                this.normalizedValues[optionName] = [value];
                            }
                        }
                        else {
                            this.normalizedValues[optionName] = value;
                        }
                    }
                }
            }
        }
        // then scan the environment variables
        for (const optionDefKey of Object.keys(this.options)) {
            const optionDefAr = this.options[optionDefKey];
            if (optionDefAr.length < 1) {
                // this should be impossible, and if it happens, we can ignore it.
                continue;
            }
            const optionDef = optionDefAr[0];
            if (Object.hasOwn(this.normalizedValues, optionDefKey)) {
                // this option has already been found in the command line
                continue;
            }
            let foundInEnv = false;
            if (this.parserOptions.env) {
                if (optionDef.env &&
                    Object.hasOwn(this.parserOptions.env, optionDef.env)) {
                    let value = this.parserOptions.env[optionDef.env];
                    if (optionDef.type === 'list') {
                        this.normalizedValues[optionDef.name] = [value];
                    }
                    else {
                        this.normalizedValues[optionDef.name] = value;
                    }
                    foundInEnv = true;
                }
            }
            // check for default value
            if (!foundInEnv && optionDef.default) {
                this.normalizedValues[optionDef.name] = optionDef.default;
            }
            // check required argument
            if (!foundInEnv && optionDef.required) {
                this.errorValues ||= {};
                let errorString = 'Missing required argument in ';
                if (optionDef.arg) {
                    errorString += `command line ${Array.isArray(optionDef.arg)
                        ? optionDef.arg.map(o => '`' + o + '`').join(', ')
                        : optionDef.arg}${optionDef.env ? ' or ' : ''}`;
                }
                if (optionDef.env) {
                    errorString += `environment variable ${optionDef.env}`;
                }
                errorString += '.';
                this.errorValues[optionDef.name] = errorString;
            }
        }
        // now that we have all the values, we can normalize them to type.
        for (const optionDefKey of Object.keys(this.normalizedValues)) {
            const optionDefAr = this.options[optionDefKey];
            if (optionDefAr.length < 1) {
                // this should be impossible, and if it happens, we can ignore it.
                continue;
            }
            const optionDef = optionDefAr[0];
            let value = this.normalizedValues[optionDefKey];
            let isError = false;
            switch (optionDef.type) {
                case 'boolean':
                    if (typeof value === 'string') {
                        let lc = value.toLocaleLowerCase();
                        if (this.parserOptions.truthy.includes(lc)) {
                            value = true;
                        }
                        else if (this.parserOptions.falsey.includes(lc)) {
                            value = false;
                        }
                        else {
                            this.errorValues ||= {};
                            this.errorValues[optionDefKey] =
                                `Could not parse boolean argument "${optionDefKey}" value "${value}"`;
                            isError = true;
                        }
                    }
                    break;
                case 'integer':
                    try {
                        value = Number.parseInt(value);
                    }
                    catch (e) {
                        this.errorValues ||= {};
                        this.errorValues[optionDefKey] =
                            `Could not parse integer argument "${optionDefKey}" value "${value}"`;
                        isError = true;
                    }
                    break;
                case 'list':
                    if (this.normalizedValues[optionDefKey]) {
                        value = (this.normalizedValues[optionDefKey]
                            .concat([value]));
                    }
                    else {
                        value = [value];
                    }
                    break;
                case 'string':
                    value = value;
                    break;
                default:
                    // should be impossible
                    this.errorValues ||= {};
                    this.errorValues[optionDefKey] =
                        `Unknown type "${optionDef.type}" for argument "${optionDefKey}"`;
                    isError = true;
            }
            if (!isError) {
                this.normalizedValues[optionDefKey] = value;
            }
        }
        if (this.errorValues && Object.keys(this.errorValues).length > 0) {
            this.normalizedValues = null;
        }
    }
    parse() {
        this.errorValues = null;
        this.values = {};
        this.normalizeOptionValues();
        if (this.normalizedValues) {
            this.validateOptionValues();
            this.handleOptionValues();
        }
        else {
            this.values = {};
        }
        this.freezeValues();
        this.hasNewOptions = false;
        return !this.hasErrors();
    }
    /**
     * Reparse the command line if it has already been parsed.
     */
    reparseIfNecessary() {
        if (this.isParsed && this.hasNewOptions) {
            this.parse();
        }
    }
    validateOptionValues() {
        const optionsSeen = new Set();
        if (!this.normalizedValues) {
            // just a typeguard -- should be impossible
            throw new Error('Cannot validate option values before normalizing.');
        }
        validationSequence: for (const optionName of this.optionSequence) {
            if (optionsSeen.has(optionName)) {
                continue;
            }
            else {
                optionsSeen.add(optionName);
            }
            if (this.hasError(optionName)) {
                // there's already been an error in this option, no neeed to validate
                // it.
                continue;
            }
            for (const optionDef of this.options[optionName]) {
                if (optionDef.required &&
                    !Object.hasOwn(this.normalizedValues, optionDef.name)) {
                    this.errorValues ||= {};
                    let errorMessage = `Missing required`;
                    if (optionDef.arg) {
                        if (Array.isArray(optionDef.arg)) {
                            switch (optionDef.arg.length) {
                                case 0:
                                    errorMessage += ' argument';
                                    break;
                                case 1:
                                    errorMessage += ` argument "${optionDef.arg[0]}"`;
                                    break;
                                case 2:
                                    errorMessage += ` arguments "${optionDef.arg[0]}" or "${optionDef.arg[1]}"`;
                                    break;
                                default:
                                    errorMessage += ` arguments "${optionDef.arg.slice(0, -1)
                                        .join('", "')}", or "${optionDef.arg.slice(-1)}"`;
                            }
                        }
                        else {
                            errorMessage += ` argument "${optionDef.arg}"`;
                        }
                        if (optionDef.env && optionDef.env.length) {
                            errorMessage += ` or`;
                        }
                    }
                    if (optionDef.env && optionDef.env.length) {
                        errorMessage += ` environment variable "${optionDef.env}"`;
                    }
                    errorMessage += '.';
                    this.errorValues[optionDef.name] = errorMessage;
                    continue validationSequence;
                }
                if (optionDef.validator) {
                    const validators = Array.isArray(optionDef.validator)
                        ? optionDef.validator
                        : [optionDef.validator];
                    let lastResult = next;
                    for (const validator of validators) {
                        lastResult = validator(optionDef.name, this.normalizedValues[optionDef.name], this.normalizedValues);
                        if (lastResult !== next) {
                            this.values[optionDef.name] = lastResult;
                            break validationSequence;
                        }
                    }
                }
            }
        }
    }
}
/**
 * Parse the command line arguments and return the results. Throws if there are
 * any errors at all.
 * @param parserOptions
 * @param optionsDef
 * @returns
 */
export function parse(parserOptions, ...optionsDef) {
    const parser = new Parser(parserOptions);
    parser.addOptions(...optionsDef);
    if (!parser.parse()) {
        throw new Error('Could not parse command line.', { cause: parser.errors });
    }
    else {
        return parser.args;
    }
}
export default Parser;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixPQUFPLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFDbkMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRWpELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBWTtJQUNyQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVTtJQUNwQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxjQUFjO0lBQ2hDLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJO0NBQUMsQ0FBQyxDQUFDLGtCQUFrQjtBQUNwRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQVk7SUFDckMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLFVBQVU7SUFDckMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsY0FBYztJQUMvQixNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSztDQUFDLENBQUMsQ0FBQyxrQkFBa0I7QUFRNUQsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQW1GbkMsTUFBTSxVQUFVLFdBQVcsQ0FBQyxJQUFXO0lBQ3JDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZixLQUFLLFNBQVMsQ0FBQztRQUNmLEtBQUssU0FBUyxDQUFDO1FBQ2YsS0FBSyxRQUFRLENBQUM7UUFDZCxLQUFLLE1BQU07WUFDVCxPQUFPLElBQW1CLENBQUM7UUFDN0I7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQ3JELENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sU0FBUyxH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