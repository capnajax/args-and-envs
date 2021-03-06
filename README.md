# args-and-envs

Command line and environment variable parser for all node apps.

This package was specifically written for the needs of Kubernetes-hosted applications. On Kubernetes, it isn't always easy setting a command line option, especially if the value of said command line option needs to come from a secret. This allows you to provide environment variable substitutes for command line options, and treats them as equivalents.

## Installation

```shell
npm install --save ags-and-envs
```

## Usage


```javascript
  import parse from 'args-and-envs';

  // these are the command line arguments and environment variables we want
  // to parse for.
  let optionsDef = [
    { name: 'xfile',
      arg: ['--xfile', '-x'],
      env: 'FILE',
      required: false
    }
  ];

  // these are options for the parser.
  let parserOptions = {
    validator: {
      file: value => {value.length < 16;}
    }
  };

  let parser = new Parser(optionsDef, parserOptions);

  parser.parse();

  console.log(parser.errors);
  console.log(parser.args);
  console.log(global.argv);

  // the xfile argument itself
  console.log(global.args.xfile);
```

The first paramter is an array containing information about the expected
command line options. The second is a set of options for how the options
should be parsed.

## Command Line Options

The command line options object has these details:

| Name | Required | Default | Description |
| ---- | -------- | ------- | ----------- |
| argv  | no  | (none) | The command line arg. If there is a value, it'll accept `arg=value` or `arg value`. If this is an array, all forms in the array are checked. For example `['--file', '-f']` means `--file=foo.txt`, `--file foo.txt`, `-f=foo.txt`, and `-f foo.txt` are all accepted.
| env | no | (none) | An environment variable that can also provide this value
| name | yes | - | The name of the option. This is what it'll look like in the `global.args` object, as well as how `handler` and `validator` functions see it. |
| required | no | `false` | If set to `true`, then it'll raise an error if the option is not provided.
| type | no | `string` | Type of the data. Will only accept the value if it can be parsed to the given type. Allowed: `integer`, `string`, `boolean`, and `list`.

### A note about `list`s

With the list type, the argument can appear multiple times in the command line. The parse will return an array of the values in that argument. For example a a script that takes multiple files with a command line like:

```sh
  $> script.js --file=text1.txt --file=text2.txt --file=text2
```

would parse to

```javascript
  { file: ['text1.txt', 'text2.txt'. 'text3.txt'] }
```

With environment variables, of course, the list can only have one element in it because of the limitations of environment variables.

Lists can only get values from command line arguments or environment variables. Not both. Like all other parameters, if a command line argument exists, the environment variable is ignored.

## Parser options

None of the parser options are required.

| Name | Default | Description |
| ---- | ------- | ----------- |
| `argv` | `process.argv.slice(2)` | The command line arguments provided. Normally this comes from the process's command line itself, but this `argv` option allows you to override it, for example, for testing or embedding.
| `env` | `process.env` | The environment variables. Normally this the same as the process's environment itself, but this `env` option allows you to override it, for example, for testing or embedding.
| `falsey` | `FALSEY_STRINGS` | For `boolean` args, what values are understood to mean `false`. The default value contains a rather broad list of strings that all could mean `false`.
| `handler` | `() => {}` | See [handler](#handler) below. The handler function is not called if neither the command line not environment variable for an option is provided, and the option does not have an default value. If the handler returns a value (including `null` but not `undefined`), it will change the value of that argument. Parameteres are validated before they are "handled".
| `global` | `argv` | Sets a global variable to contain all the arguments. Set to `null` to prevent setting a global variable. |
| `truthy` | `TRUTHY_STRINGS` | For `boolean` args, what values are understood to mean `true`. The default value contains a rather broad list of strings that all could mean `true`.
| `unknown` | `error` | How to handle unknown command line arguments. Must be `error`, `ignore`, or `capture`. If set it `capture`, it'll assign it to a list called `*`. This list is both validated and handled. Unknown environment variables are always ignored regardless of this option.
| `validator` | `() => true` | Validators. These must return `true` or `false` and does not support promises. Same `object`/`function` form as [handler](#handler) below. The validator is called for all options, even if the user didn't provid it in the command line or environment variables, and there is no default values.

### handler

The handler can be a function or an object. The function is called for all
parameters; the object is a set of `key=function` pairs that are only called
for individual functions. If this is an Array, it'll run the handlers in the array order.

#### handler functions

```javascript
handler = (name, value, args) { ... }
```

* `name` - the name of the argument
* `value` - the value of the argument
* `args` - the entire set of arguments

#### handler object

```javascript
handler = {
  name1: function(value1, args) { ... },
  name2: function(value2, args) { ... }
}
```

* `name_x` - the name of the argument
* `value_x` - the value of the argument
* `args` - the entire set of arguments

There is no need to define every needed parameter name. Any parameters not
provided here will get the default handling.

## Parse errors

If the command line cannot be parsed, it'll return a list of error objects with the following data:

| field | Description |
| ----- | ----------- |
| `code`  | The error code. One of `PARSE`, `TYPE_UNKNOWN`, `VALIDATION`, `UNKNOWN_ARG`, `MISSING_ARG` |
| `message` | A friendly error message |
| `arg` | The command line object as provided in the `optionsDef` array. Not provided if `code == UNKNOWN_ARG` |
| `source` | Whether argument was provided by the `ARGV` or the environment variables, `ENV`. Not provided when `code == MISSING_ARG` |
| `argString` | The whole command line argument word. For example `--foo=bar` would report the entire `--for=bar`, but `-f bar` would be `-f`. Only provided for `code == UNKNOWN_ARG` |
| `value` | The raw value of the argument as a string. Provided if `code` is one of `PARSE`, `TYPE_UNKNOWN`, or `VALIDATION` |

## Development

This package was specifically written for apps that run in Kubernetes, so future changes will mainly focus on features that would be useful to developers writing Kubernetes applications.

Specifically, array types are prioritized and usage guide generators are deprioritized.
