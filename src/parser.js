'use strict';

const TRUTHY_STRINGS = [
  'true', 'yes', 'y', 'on', // english
  '1', 'high', 'h', // electronics
  'da', 'ja', 'oui', 'si', 'sí']; // other languages
const FALSEY_STRINGS = [
  'false', 'no', 'n', 'off', // english
  '0', 'low', 'l', // electronics
  'nyet', 'niet', 'geen', 'nein', 'non']; // other languages

const ERROR_PARSE = 'PARSE';
const ERROR_TYPE_UNKNOWN = 'TYPE_UNKNOWN';
const ERROR_VALIDATION = 'VALIDATION';
const ERROR_UNKNOWN_ARG = 'UNKNOWN_ARG';
const ERROR_MISSING = 'MISSING_ARG';

const SOURCE_ENV = 'ENV';
const SOURCE_ARGV = 'ARGV';

class Parser {
  #optionsDef;
  #parserOptions;
  #isParsed = false;
  #values = {};
  #errors = [];

  #argv;
  #env;

  #handler;
  #validator;
  #objectForms;

  constructor (optionsDef, parserOptions={}) {
    this.#optionsDef = optionsDef;
    this.#parserOptions = parserOptions
      ? Object.fromEntries(Object.entries(parserOptions))
      : {};

    this.#argv = parserOptions.argv || process.argv.slice(2);
    this.#env = parserOptions.env || process.env;

    this.#handler = parserOptions.handler || (() => {});
    this.#validator = parserOptions.validator || (() => true);

    // if handlers are in object form (name -> object), they must be converted
    // to function form to start.
    this.#objectForms = {};
    for (let o of ['#handler', '#validator']) {
      switch (typeof this[o]) {
      case 'function':
        // no need to change
        break;
      case 'object':
        for (let i in Object.keys(this[o])) {
          if (typeof handler[i] !== 'function') {
            throw new Error(`parserOptions.${o}[${i}] must be a function`);
          }
          this.#objectForms[o] = this.#parserOptions[o];
          this.#parserOptions[o] = (oo => {
            return ((name, value, args) => {
              if (this.#validator[oo].hasOwnProperty(name)) {
                this.#objectForms[o][name](value, args);
              } else {
                return true;
              }
            });
          })(o);
        }
        break;
      case 'undefined':
        this.#parserOptions[o] = () => true;
        break;
      default: 
        throw new Error(`parserOptions.${o} must be a function or an object of ` +
          'name=function pairs');
      }
    }
  }

  #isFalsey(str) {
    if (this.#parserOptions.falsey) {
      return this.#parserOptions.falsey.includes(str);
    } else {
      return FALSEY_STRINGS.includes(str);
    }
  }
  #isTruthy(str) {
    if (this.#parserOptions.falsey) {
      return this.#parserOptions.truthy.includes(str);
    } else {
      return TRUTHY_STRINGS.includes(str);
    }
  }
  #normalizeValue(commandArg, argValue, source) {

    let result = undefined;
    let parseErrorMessage = () => {
      this.#errors.push({
        code: ERROR_PARSE,
        message: `Could not parse argument "${commandArg.name}" value "${
          argValue}" as ${commandArg.type}.`,
        arg: commandArg,
        source,
        value: argValue
      })
    }

    if (argValue === undefined || argValue === null) {
      if (commandArg.hasOwnProperty('default')) {
        return commandArg.default;
      }
    }

    switch (commandArg.type || 'string') {
    case 'boolean':
      let lc = argValue.toLocaleLowerCase();
      if (this.#isTruthy(lc)) {
        result = true;
      } else if (this.#isFalsey(lc)) {
        result = false;
      } else {
        parseErrorMessage();
      }
      break;

    case 'integer':
      try {
        result = Number.parseInt(argValue);
      } catch(e) {
        result = NaN;
        parseErrorMessage();
      }
      if (Number.isNaN(result)) {
        parseErrorMessage();
        result = undefined;
      }
      break;

    case 'string':
      result = argValue;
      break;

    default:
      this.#errors.push({
        code: ERROR_TYPE_UNKNOWN,
        message: `Type "${commandArg.type}" for argument "${commandArg.name
          }" not known.`,
        source,
        arg: commandArg,
        value: argValue
      });
    }

    return result;
  }

  #parse() {
    let argValues = {};
    let missingArgs = new Set();
    
    // first the command line arguments, in the order they were provided.
    let argIdx = 0;
    while (argIdx < this.#argv.length) {
      let fullArg = this.#argv[argIdx];
      let arg = fullArg.replace(/=.*/, '');
      let argFound;
      argFound = false;
      for (let ca of this.#optionsDef) {
        if (Array.isArray(ca.arg)) {
          if (ca.arg.includes(arg)) {
            argFound = ca;
          }
        }else if (ca.arg === arg) {
          argFound = ca;
        }
        if (argFound) {
          break;
        }
      }

      if (argFound) {

        let argValue;
        if (fullArg !== arg) {
          argValue = this.#normalizeValue(
            argFound, fullArg.match(/(?<==).*/g).shift(), SOURCE_ARGV);
        } else {
          // @ts-ignore
          if (argFound.type === 'boolean') {
            argValue = true;
          } else {
            argValue = this.#normalizeValue(
              argFound, this.#argv[++argIdx], SOURCE_ARGV);
          }
        }
        if (undefined === argValue) {
          // if there is an error, it would have already been reported by
          // normalizeValue. 
        } else {
          // @ts-ignore
          argValues[argFound.name] = argValue;        
        }
      } else {
        this.#errors.push({
          code: ERROR_UNKNOWN_ARG,
          message: `Unknown command line switch: ${fullArg}`,
          source: SOURCE_ARGV,
          argString: fullArg
        });
      }
      ++argIdx;
    }

    // now check the `optionsDef` in order. If the argument wasn't provided in
    // the command line, check the environment variables.

    for (let ca of this.#optionsDef) {
      let missingButRequired = false;
      if (argValues.hasOwnProperty(ca.name)) {
        // do nothing -- skip the env checking
      } else if (this.#env.hasOwnProperty(ca.env)) {
        let envValue = this.#env[ca.env];
        let normalizedValue = this.#normalizeValue(ca, envValue, SOURCE_ENV);
        // no need to report an error -- normalizeValue would have already
        // done that.
        argValues[ca.name] = normalizedValue;
      } else if (ca.default) {
        argValues[ca.name] = ca.default;
      } else if (ca.required) {
        missingButRequired = true;
      }

      let missingError;
      if (missingButRequired) {
        missingArgs.add(ca.name);
        missingError = 'Missing required ';
        let arg = ca.arg
          ? (Array.isArray(ca.arg) ? ca.arg.join(', ')+',' : ca.arg)
          : null;
        if (ca.env && arg) {
          missingError += `argument ${arg} or environment variable ${ca.env}`;
        } else if (arg) {
          missingError += `argument ${arg}`
        } else {
          missingError += `environment variable ${ca.env}`;
        }
        this.#errors.push({
          code: ERROR_MISSING,
          message: missingError,
          arg: ca
        });
      }
    }

    // All the arguments are normalized. Let's validate them.
    for (let ca of this.#optionsDef) {
      if (missingArgs.has(ca.name)) {
        continue;
      }
      let validationSuccess = this.#validator(
        ca.name, argValues[ca.name], argValues);
      if (!validationSuccess) {
        this.#errors.push({
          code: ERROR_VALIDATION,
          message: `Failed to validate "${ca.name}" parameter value "${
            argValues[ca.name]}"`,
          arg: ca,
          value: argValues[ca.name]
        });
      }
    }

    if (this.#errors.length) {
      return false;
    } else {
      // Now that everything is validated, execute the command line arguments in
      // order of `optionsDef`.
      for (let ca of this.#optionsDef) {
        if (argValues.hasOwnProperty(ca.name)) {
          this.#handler(ca.name, argValues[ca.name], argValues);
        }
      }
      global.args = {};
      for (let key of Object.keys(argValues)) {
        global.args[key] = argValues[key].value;
      }
      return true;
    }    
  }

  parse() {
    this.#isParsed = true;
    return this.#parse();
  }

  get errors() {
    if (!this.#isParsed) {
      this.parse();
    }
    if (this.#errors) {
      return this.#errors.length ? this.#errors : null;
    } else {
      return null;
    }
  }
}

/**
 * @function parse
 * Parse a command line
 * @param {Array} optionsDef
 * @param {object} [options={}] options
 * @param {array} [options.argv] the command line arguments. Default is
 *  `process.argv.slice(2)`.
 * @param {object} [options.env] the environment variables. Default is
 *  `process.env`.
 * @param {Array} [options.falsey] define a set of strings to indicate 'true'
 *  for boolean params. Defaults to `FALSEY_STRINGS`
 * @param {function|object} [options.handler] function called to provide special
 *  handling for individual parameters, or an object mapping parameter names
 *  to individual handlers.
 * @param {Array} [options.truthy] define a set of strings to indicate 'true'
 *  for boolean params. Defaults to `TRUTHY_STRINGS`
 * @param {function|object} [options.validator] function called to provide
 *  special validation for individual parameters, or an object mapping parameter
 *  names to individual validations.
 * @return {null|array} `null` if no problems, an array of error
 *  messages if there are problems
 */
function parse(optionsDef, options={}) {
  let parser = new Parser(optionsDef, options);
  parser.parse();
  return parser.errors;
}

export default parse;
export {
  parse,
  Parser,
  TRUTHY_STRINGS,
  FALSEY_STRINGS
};

