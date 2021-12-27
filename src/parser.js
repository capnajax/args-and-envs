'use strict';

const TRUTHY_STRINGS = [
  'true', 'yes', 'y', 'on', // english
  '1', 'high', 'h', // electronics
  'da', 'ja', 'oui', 'si', 'sí']; // other languages
const FALSEY_STRINGS = [
  'false', 'no', 'n', 'off', // english
  '0', 'low', 'l', // electronics
  'nyet', 'niet', 'geen', 'nein', 'non']; // other languages

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

  const normalizeValue = (commandArg, argValue) => {

    let result = undefined;

    if (argValue === undefined || argValue === null) {
      if (commandArg.hasOwnProperty('default')) {
        return commandArg.default;
      }
    }

    switch (commandArg.type) {
    case 'boolean':
      let lc = argValue.toLocaleLowerCase();
      if (isTruthy(lc)) {
        result = true;
      } else if (isFalsey(lc)) {
        result = false;
      } else {
        errors.push(`Could not parse argument "${commandArg.name}" value "${
          argValue(commandArg.name)}" as boolean.`);
      }
      break;

    case 'integer':
      try {
        result = Number.parseInt(argValue);
      } catch(e) {
        errors.push(`Could not parse argument "${commandArg.name}" value "${
          argValue(commandArg.name)}" as a number.`);
      }   
      break;

    case 'string':
      result = argValue;
      break;

    default:
      errors.push(`Type "${commandArg.type}" for argument "${commandArg.name
      }" not known.`);
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
    var env = options.argv || process.env;

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
            return ((name, args) => {
              if (validator[oo].hasOwnProperty(name)) {
                _handlerObj[name](args);
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
      } else {
        continue;
      }
      break;
    }

    if (argFound) {
      let argValue;
      if (fullArg !== arg) {
        argValue = normalizeValue(
          argFound, fullArg.match(/(?<==).*/g).shift());
      } else {
        // @ts-ignore
        if (argFound.type === 'boolean') {
          argValue = true;
        } else {
          argValue = normalizeValue(
            argFound, process.argv[++argIdx]);
        }
      }
      if (undefined === argValue) {
        // @ts-ignore
        errors.push(`Invalid value on ${argFound.type} parameter ${fullArg}`); 
        // no need to accept parameter. It can't be validated and now that
        // there's aready an error, it won't be processed.
      } else {
        // @ts-ignore
        argValues[argFound.name] = argValue;        
      }
    } else {
      errors.push(`Unknown command line switch: ${fullArg}`);
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
      let normalizedValue = normalizeValue(ca, envValue);
      if (undefined === normalizedValue) {
        errors.push(`Invalid value on ${ca.type} env ${ca.env}: ${envValue}`);
      }
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
      if (ca.env && ca.arg) {
        missingError += `argument ${ca.arg} or environment variable ${ca.env}`;
      } else if (ca.arg) {
        missingError += `argument ${ca.arg}`
      } else {
        missingError += `environment variable ${ca.env}`;
      }
      errors.push(missingError);
    }
  }

  // All the arguments are normalized. Let's validate them.
  for (let ca of env) {
    if (missingArgs.has(ca.name)) {
      continue;
    }
    let validationError = validator(ca.name, argValues);
    if (validationError) {
      errors.push(validationError);
    }
  }

  if (errors.length) {
    return errors
  } else {
    // Now that everything is validated, execute the command line arguments in
    // order of `optionsDef`.
    for (let ca of optionsDef) {
      if (argValues.hasOwnProperty(ca.name)) {
        handleArg(ca.name, argValues[ca.name]);
      }
    }
    global.args = argValues.map(v=>v.value);
    return null;
  }
}

export default parse;
export {
  parse,
  TRUTHY_STRINGS,
  FALSEY_STRINGS
};

