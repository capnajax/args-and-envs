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

  const normalizeValue = (commandArg, argValue, source) => {

    let result = undefined;
    let parseErrorMessage = () => {
      errors.push({
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
      if (isTruthy(lc)) {
        result = true;
      } else if (isFalsey(lc)) {
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
      errors.push({
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
  
  { // these vars need to be `var`s, not `let`s -- I am relying on hoisting to
    // export these variables from the closure
    var isFalsey = (str) => {
      if (options.falsey) {
        return options.falsey.includes(str);
      } else {
        return FALSEY_STRINGS.includes(str);
      }
    }
    var isTruthy = (str) => {
      if (options.falsey) {
        return options.truthy.includes(str);
      } else {
        return TRUTHY_STRINGS.includes(str);
      }
    }

    var argv = options.argv || process.argv.slice(2);
    var env = options.env || process.env;

    var handler = options.handler || (() => {});
    var validator = options.validator || (() => true);
    // used for handling object-form handler and validators
    let objForms = {};

    // convert object form handlers and validators to function form handlers
    // and validators
    for (let o of ['handler', 'validator']) {
      switch (typeof options[o]) {
      case 'function':
        // no need to change
        break;
      case 'object':
        for (let i in Object.keys()) {
          if (typeof handler[i] !== 'function') {
            throw new Error(`options.${o}[${i}] must be a function`);
          }
          objForms[o] = options[o];
          options[o] = (oo => {
            return ((name, value, args) => {
              if (validator[oo].hasOwnProperty(name)) {
                _handlerObj[name](value, args);
              } else {
                return true;
              }
            });
          })(o);
        }
        break;
      case 'undefined':
        options[o] = () => true;
        break;
      default: 
        throw new Error(`options.${o} must be a function or an object of ` +
          'name=function pairs');
      }
    }
  }
  
  // this functions own parameters are parsed at this point. now parse the
  // command line

  let argValues = {};
  let missingArgs = new Set();
  let errors = [];

  // first the command line arguments, in the order they were provided.
  let argIdx = 0;
  while (argIdx < argv.length) {
    let fullArg = argv[argIdx];
    let arg = fullArg.replace(/=.*/, '');
    let argFound;
    argFound = false;
    for (let ca of optionsDef) {
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
        argValue = normalizeValue(
          argFound, fullArg.match(/(?<==).*/g).shift(), SOURCE_ARGV);
      } else {
        // @ts-ignore
        if (argFound.type === 'boolean') {
          argValue = true;
        } else {
          argValue = normalizeValue(
            argFound, argv[++argIdx], SOURCE_ARGV);
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
      errors.push({
        code: ERROR_UNKNOWN_ARG,
        message: `Unknown command line switch: ${fullArg}`,
        source: SOURCE_ARGV,
        argString: fullArg
      });
    }
    ++argIdx;
  }

  // now check the `optionsDef` in order. If the argument wasn't provided in the
  // command line, check the environment variables.

  for (let ca of optionsDef) {
    let missingButRequired = false;
    if (argValues.hasOwnProperty(ca.name)) {
      // do nothing -- skip the env checking
    } else if (env.hasOwnProperty(ca.env)) {
      let envValue = env[ca.env];
      let normalizedValue = normalizeValue(ca, envValue, SOURCE_ENV);
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
      errors.push({
        code: ERROR_MISSING,
        messag: missingError,
        arg: ca
      });
    }
  }

  // All the arguments are normalized. Let's validate them.
  for (let ca of optionsDef) {
    if (missingArgs.has(ca.name)) {
      continue;
    }
    let validationSuccess = validator(ca.name, argValues[ca.name], argValues);
    if (!validationSuccess) {
      errors.push({
        code: ERROR_VALIDATION,
        message: `Failed to validate "${ca.name}" parameter value "${
          argValues[ca.name]}"`,
        arg: ca,
        value: argValues[ca.name]
      });
    }
  }

  if (errors.length) {
    return errors
  } else {
    // Now that everything is validated, execute the command line arguments in
    // order of `optionsDef`.
    for (let ca of optionsDef) {
      if (argValues.hasOwnProperty(ca.name)) {
        handler(ca.name, argValues[ca.name], argValues);
      }
    }
    global.args = {};
    for (let key of Object.keys(argValues)) {
      global.args[key] = argValues[key].value;
    }
    return null;
  }
}

export default parse;
export {
  parse,
  TRUTHY_STRINGS,
  FALSEY_STRINGS
};

