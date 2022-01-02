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

  #argv = {}; // the parsed arguments
  #errors = [];

  #isParsed = false;
  #global = 'argv';
  #handlers = [(name, value) => {
    this.#argv[name] = value;
  }];
  #optionsDef;
  #processArgv; // the command line arguments as provided
  #processEnv; // the environment variables as provided
  #parserOptions;
  #validators = [];

  constructor (optionsDef, parserOptions={}) {
    this.#optionsDef = optionsDef;
    this.#parserOptions = parserOptions
      ? Object.fromEntries(Object.entries(parserOptions))
      : {};

    this.#processArgv = parserOptions.argv || process.argv.slice(2);
    this.#processEnv = parserOptions.env || process.env;

    // if handlers are in object form (name -> object), they must be converted
    // to function form to start.
    if (parserOptions.handler) {
      Array.isArray(parserOptions.handler) 
        ? this.#handlers.push.apply(this, parserOptions.handler)
        : this.#handlers.push(parserOptions.handler);
    }
    if (parserOptions.validator) {
      Array.isArray(parserOptions.validator) 
        ? this.#validators.push.apply(this, parserOptions.validator)
        : this.#validators.push(parserOptions.validator);
    }
  }

  #handle(name, value, args) {
    let result = value;
    let updatedArgs = { ... args };
    for (let h of this.#handlers) {
      let maybeNewValue;
      switch(typeof h) {
      case 'function':
        maybeNewValue = h(name, result, updatedArgs);
        break;
      case 'object': 
        if (typeof h[name] === 'function') {
          maybeNewValue = h[name](result, updatedArgs);
        }
      }
      if (undefined !== maybeNewValue) {
        value = maybeNewValue;
        updatedArgs[name] = maybeNewValue;
      }
    }
    return value;
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

    case 'list':
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
    while (argIdx < this.#processArgv.length) {
      let fullArg = this.#processArgv[argIdx];
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
              argFound, this.#processArgv[++argIdx], SOURCE_ARGV);
          }
        }
        if (undefined === argValue) {
          // if there is an error, it would have already been reported by
          // normalizeValue. 
        } else {
          // @ts-ignore
          if (argFound.type === 'list') {
            argValues[argFound.name] || (argValues[argFound.name] = []);
            argValues[argFound.name].push(argValue);
          } else {
            argValues[argFound.name] = argValue;
          }
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
      } else if (this.#processEnv.hasOwnProperty(ca.env)) {
        let envValue = this.#processEnv[ca.env];
        let normalizedValue = this.#normalizeValue(ca, envValue, SOURCE_ENV);
        // no need to report an error -- normalizeValue would have already
        // done that.
        argValues[ca.name] = ca.type === 'list' 
          ? [ normalizedValue ]
          : normalizedValue;
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
      let validationSuccess = this.#validate(
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
          argValues[ca.name] =
            this.#handle(ca.name, argValues[ca.name], argValues);
        }
      }
      if (this.#global) {
        global[this.#global] = Object.fromEntries(Object.entries(this.#argv));
      }          
      return true;
    }    
  }

  #validate(name, value, args) {
    let valid = true;
    let loop = 0;
    for (let v of this.#validators) {
      switch(typeof v) {
      case 'function':
        if (!v(name, value, args)) {
          valid = false;
        }
        break;
      case 'object': 
        if (typeof v[name] === 'function') {
          if (!v[name](value, args)) {
            valid = false;
          }
        }
        break;
      }
    }
    return valid;
  }

  /**
   * @method parse
   * Run the parser.
   * @returns `true` if the options were parsed successfully, `false` if there
   *  is at least one error.
   */
  parse() {
    this.#isParsed = true;
    return this.#parse();
  }

  /**
   * @method Tag#get.argv
   * Returns an object containing the arguments this parse found in the command
   *  line and environment variables. If the parser hasn't been run yet, this
   *  method will run it automatically.
   * @returns {object}
   */
   get argv() {
    if (!this.#isParsed) {
      this.parse();
    }
    return this.#argv;
  }

  /**
   * @method Tag#get.errors
   * If the parser found any errors in the command line / environment variables,
   *  this will return a list of errors. If there are no errors in the command
   *  line, this will return null;
   * @returns {object|null}
   */
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

export default Parser;
export {
  parse,
  Parser,
  TRUTHY_STRINGS,
  FALSEY_STRINGS
};

