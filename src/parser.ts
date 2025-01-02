'use strict';

import process from 'node:process';
import { isSymbolObject } from 'node:util/types';

export const TRUTHY_STRINGS:string[] = [
  'true', 'yes', 'y', 'on', // english
  '1', 'high', 'h', // electronics
  'da', 'ja', 'oui', 'si', 'sí']; // other languages
export const FALSEY_STRINGS:string[] = [
  'false', 'no', 'n', 'off', // english
  '0', 'low', 'l', // electronics
  'nyet', 'niet', 'geen', 'nein', 'non']; // other languages

export type HandlerResult = {
  value?: unknown,
  next?: boolean
};
export type ArgType = string|number|boolean|string[];
export type ArgTypeName = 'boolean'|'integer'|'string'|'list';
export const next = Symbol('next');

type ArgsArg = Record<string, ArgType>;

/**
 * Functions that are called on all known command line options. These functions
 * are called in the order they are first added to the parser. These functions
 * return an object that contains value that should be stored in the `argv`
 * object. The value is an object with `value` being the value to use, and
 * `next` being a boolean that indicates whether to continue to the next.
 * 
 * If `next` is `true`, the next handler will be called but with the value this
 * handler returned. If `next` is `false`, the next handler will not be called
 * and the value will be stored in the `argv` object.
 * 
 * Optionally, the handler can also simply return `next` (the symbol) to defer
 * to the next handler without changing the value.
 * 
 * These functions can be overridden by using `addOption` to add a new option
 * with a handler that returns a value. Overriding handlers can defer to the
 * original handler by returning `next`.
 * 
 * If a handler returns a value, but `next` is `true`, the value should be
 * a string, number, boolean, or an array of strings. If `next` is `false`, the
 * value can be any type.
 * 
 * Handlers must return values immediately. They cannot be asynchronous. They
 * also must be idempotent.
 */
type Handler = (
  name:string, value:ArgType|undefined, args:ArgsArg
)=>HandlerResult|Symbol;

/**
 * Functions that are called on all known command line options. These functions
 * are called in the order they are first added to the parser. These functions
 * return `null` if the value is valid or an error message if the value is not
 * valid.
 * 
 * These functions can be overridden by using `addOption` to add a new option
 * with a validator that returns a value. Overriding validators can defer to the
 * original validator by returning `next`.
 * 
 * Validators must return values immediately. They cannot be asynchronous. They
 * also must be idempotent.
 */
type Validator = (name:string, value:ArgType, args:ArgsArg)=>string|null|Symbol;

export interface OptionsDef {
  arg?: string[]|'positional',
  default?: ArgType,
  description?: string,
  env?: string,
  handler?: Handler|Handler[],
  name: string,
  required?: boolean,
  silent?: boolean,
  type?: ArgTypeName,
  validator?: Validator|Validator[]
}

interface NormalizedOptionsDef {
  arg: string[]|'positional',
  default?: ArgType,
  description?: string,
  env: string|null,
  handler: Handler[],
  name: string,
  required: boolean,
  silent: boolean,
  type: ArgTypeName,
  validator: Validator[]
}

export interface ParserOptions {
  argv:string[],
  env:Record<string, string>,
  falsey:string[],
  global: string|null,
  truthy:string[]
}

export function argTypeName(name:string):ArgTypeName {
  switch (name) {
  case 'boolean':
  case 'integer':
  case 'string':
  case 'list':
    return name as ArgTypeName;
  default:
    throw new Error(`Unknown argument type "${name}"`);
  }
}

export const stringArg = argTypeName('string');
export const booleanArg = argTypeName('boolean');
export const integerArg = argTypeName('integer');
export const listArg = argTypeName('list');

export class Parser {

  private errorValues:Record<string, string>|null = null;

  /**
   * If the command line has ever been parsed, this will be true.
   */
  private isParsed = false;
  /**
   * If new options have been added since the last time the command line was
   * parsed, this will be true.
   */
  private hasNewOptions = true;

  /**
   * These are the options that have been added to the parser. Note that these
   * map option names to an array of `OptionsDef` because it is possible to
   * override an option. Only the first option in the array (last added) will
   * be used for parsing the command line, but all the handlers and validators
   * will be called in order for each option, unlesss one of the handlers or
   * validators returns a `stop` value of `true`.
   */
  private options:Record<string, NormalizedOptionsDef[]> = {};

  private optionSequence:string[] = [];

  private parserOptions:ParserOptions = {
    argv: process.argv.slice(2),
    env: process.env as Record<string, string>,
    global: 'argv',
    falsey: FALSEY_STRINGS,
    truthy: TRUTHY_STRINGS
  };

  /**
   * These are the values from the command line before they've been handled
   * or validated but after they've been normalized to their type.
   */
  private normalizedValues:Record<string, ArgType>|null = null;

  /**
   * These are the values as parsed. It will be empty until the command line
   * has been parsed for the first time.
   */
  private values:Record<string, unknown> = {};

  constructor(
    parserOptions:Partial<ParserOptions>,
    ...optionsDef:(OptionsDef[]|OptionsDef)[]
  ) {
    this.parserOptions = Object.assign(this.parserOptions, parserOptions);
    this.addOptions(...optionsDef);
  }

  get args():Record<string, unknown> {
    return this.values;
  }

  get errors():Record<string, string>|null {
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
  addOption(option:OptionsDef, reparseIfNecessary = true) {
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
  addOptions(...optionDefSet:(OptionsDef|OptionsDef[])[]) {
    for (const ods of optionDefSet) {
      if (Array.isArray(ods)) {
        for (const od of ods) {
          this.addOption(od, false);
        }
      } else {
        this.addOption(ods, false);
      }
    }
    this.reparseIfNecessary();
  }

  private freezeValues():void {
    for (const key of Object.keys(this.values)) {
      if (typeof this.values[key] === 'object') {
        Object.freeze(this.values[key]);
      }
    }
    Object.freeze(this.values);
    Object.freeze(this.errorValues);
  }

  private handleOptionValues():void {
    const optionsSeen = new Set<string>();
    if (!this.normalizedValues) {
      // just a typeguard -- should be impossible
      throw new Error('Cannot handle option values before normalizing.');
    }
    for (const optionName of this.optionSequence) {
      if (optionsSeen.has(optionName)) {
        continue;
      } else {
        optionsSeen.add(optionName);
      }
      handlerSequence:
      for (
        const optionDef of
        this.options[optionName].concat(
          this.normalizeOptionDef({ name: optionName,
            handler: [
            (name:string, value:ArgType|undefined) => ({ value, next: false })
            ]
          })
        )
      ) {
        if (optionDef.handler) {
          const handlers = (Array.isArray(optionDef.handler)
            ? optionDef.handler
            : [optionDef.handler]);          
          let lastResult:unknown = this.normalizedValues[optionDef.name];
          for (const handler of handlers) {
            const handlerReturn:HandlerResult|Symbol = handler(
              optionDef.name,
              lastResult as ArgType,
              this.normalizedValues
            );
            if (handlerReturn === next) {
              continue;
            } else if (isSymbolObject(handlerReturn)) {
              this.errorValues ||= {};
              this.errorValues[optionDef.name] =
                `Unknown handler return symbol for option "${
                  optionDef.name}": ${handlerReturn.toString()}`;
              break handlerSequence;
            } else {
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

  private hasError(optionName:string):boolean {
    return !! (this.errorValues && Object.hasOwn(this.errorValues, optionName));
  }

  private hasErrors():boolean {
    return !! (this.errorValues && Object.keys(this.errorValues).length > 0);
  }

  private normalizeOptionDef(def:OptionsDef|OptionsDef[])
  :NormalizedOptionsDef[] {
    if (Array.isArray(def)) {
      return def.map(d => this.normalizeOptionDef(d)).flat();
    } else {
      return [Object.assign({
        arg: [],
        default: undefined,
        description: undefined,
        env: [],
        handler: [],
        required: false,
        silent: false,
        type: def.arg === 'positional' ? listArg : stringArg,
        validator: []
      }, def)];
    }
  }

  /**
   * Get the value of the options before they have been normalized or validated.
   */
  private normalizeOptionValues():void {
    this.errorValues = null;
    this.normalizedValues = {};

    // first scan the command line arguments
    if (this.parserOptions.argv?.length) {
      for (let argIdx = 0; argIdx < this.parserOptions.argv?.length; argIdx++) {
        const arg = this.parserOptions.argv[argIdx];
        let argSwitch = arg.replace(/=.*/, '');
        let foundOption = false;
        for (const optionName of Object.keys(this.options)) {
          if (
            this.options[optionName]?.length &&
            this.options[optionName][0].arg?.includes(argSwitch)
          ) {
            foundOption = true;
            const optionDef = this.options[optionName][0];
            let value:ArgType = (
              arg === argSwitch
                ? ( optionDef.type === 'boolean'
                    ? true
                    : this.parserOptions.argv[++argIdx])
                : arg.replace(/.*=/, '')
            );
            if (optionDef.type === 'list') {
              if (this.normalizedValues[optionName]) {
                (this.normalizedValues[optionName] as string[])
                  .push(value as string);
              } else {
                this.normalizedValues[optionName] = [value as string];
              }
            } else {
              this.normalizedValues[optionName] = value;
            }
          }
        }
        if (!foundOption) {
          // find the positional parameter
          const positionalOption =
            Object.keys(this.options).find(k => {
              const o = this.options[k][0];
              return (o.arg === 'positional');
            });
          if (positionalOption) {
            this.normalizedValues[positionalOption] ||= ([] as string[]);
            (this.normalizedValues[positionalOption] as string[]).push(arg);
          } else {
            this.errorValues ||= {};
            this.errorValues[argSwitch] =
              `Unknown command line option "${argSwitch}"`;  
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
        if (
          optionDef.env &&
          Object.hasOwn(this.parserOptions.env, optionDef.env)
        ) {
          let value = this.parserOptions.env[optionDef.env];
          if (optionDef.type === 'list') {
            this.normalizedValues[optionDef.name] = [value];
          } else {
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
          errorString += `command line ${
            Array.isArray(optionDef.arg)
              ? optionDef.arg.map(o => '`'+o+'`').join(', ')
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
          } else if (this.parserOptions.falsey.includes(lc)) {
            value = false;
          } else {
            this.errorValues ||= {};
            this.errorValues[optionDefKey] =
              `Could not parse boolean argument "${
                optionDefKey}" value "${value}"`;
            isError = true;
          }
        }
        break;
      case 'integer':
        try {
          value = Number.parseInt(value as string);
        } catch(e) {
          this.errorValues ||= {};
          this.errorValues[optionDefKey] =
            `Could not parse integer argument "${
              optionDefKey}" value "${value}"`;
          isError = true;
        }
        break;
      case 'list':
        if (this.normalizedValues[optionDefKey]) {
          value = (
            (this.normalizedValues[optionDefKey] as string[])
              .concat([value as string])
          );
        } else {
          value = [value as string];
        }
        break;
      case 'string':
        value = value as string;
        break;
      default:
        // should be impossible
        this.errorValues ||= {};
        this.errorValues[optionDefKey] =
          `Unknown type "${optionDef.type}" for argument "${
            optionDefKey}"`;
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

  parse():boolean {
    this.errorValues = null;
    this.values = {};
    this.normalizeOptionValues();
    if (this.normalizedValues) {
      this.validateOptionValues();
      this.handleOptionValues();
    } else {
      this.values = {};
    }
    this.freezeValues();
    this.hasNewOptions = false;
    return ! (this.errorValues && (Object.keys(this.errorValues))?.length > 0);
  }

  /**
   * Reparse the command line if it has already been parsed.
   */
  reparseIfNecessary() {
    if (this.isParsed && this.hasNewOptions) {
      this.parse();
    }
  }

  private validateOptionValues():void {
    const optionsSeen = new Set<string>();
    if (!this.normalizedValues) {
      // just a typeguard -- should be impossible
      throw new Error('Cannot validate option values before normalizing.');
    }
    validationSequence:
    for (const optionName of this.optionSequence) {
      if (optionsSeen.has(optionName)) {
        continue;
      } else {
        optionsSeen.add(optionName);
      }
      if (this.hasError(optionName)) {
        // there's already been an error in this option, no neeed to validate
        // it.
        continue;
      }
      for (const optionDef of this.options[optionName]) {
        if (
          optionDef.required &&
          ( ( ! Object.hasOwn(this.normalizedValues, optionDef.name) ) ||
            this.normalizedValues[optionDef.name] === null ||
            this.normalizedValues[optionDef.name] === undefined
          )
        ) {
          this.errorValues ||= {};
          let errorMessage = `Missing required`;
          if (optionDef.arg) {
            if (Array.isArray(optionDef.arg)) {
              switch(optionDef.arg.length) {
              case 0:
                errorMessage += ' argument';
                break;
              case 1:
                errorMessage += ` argument "${optionDef.arg[0]}"`;
                break;
              case 2:
                errorMessage += ` arguments "${optionDef.arg[0]}" or "${
                  optionDef.arg[1]}"`;
                break;
              default:
                errorMessage += ` arguments "${optionDef.arg.slice(0,-1)
                  .join('", "')}", or "${optionDef.arg.slice(-1)}"`;
              }
            } else {
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
          console.log('errorMessage:', errorMessage);
          this.errorValues ||= {};
          this.errorValues[optionDef.name] = errorMessage;
          continue validationSequence;
        }

        if (optionDef.validator) {
          const validators = Array.isArray(optionDef.validator)
            ? optionDef.validator
            : [optionDef.validator];
          let lastResult:string|null|Symbol = next;
          for (const validator of validators) {
            lastResult = validator(
              optionDef.name,
              this.normalizedValues[optionDef.name],
              this.normalizedValues
            );
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
export function parse(
  parserOptions:Partial<ParserOptions>,
  ...optionsDef:(OptionsDef[]|OptionsDef)[]
):Record<string, unknown> {
  const parser = new Parser(parserOptions);
  parser.addOptions(...optionsDef);
  if (!parser.parse()) {
    throw new Error(
      'Could not parse command line.',
      { cause: parser.errors });
  } else {
    return parser.args;
  }
}

export default Parser;

