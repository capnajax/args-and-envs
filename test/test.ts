'use strict';

import TestBattery from 'test-battery';
import Parser, { argTypeName, ArgTypeName, booleanArg, integerArg, listArg, parse, stringArg } from '../src/parser.js';
import { describe, it } from 'node:test';

const optionsDef = [{
  name: 'integer',
  arg: ['--int', '--integer', '-i'],
  env: 'INTEGER',
  type: integerArg,
  required: false,
  default: 10
}, {
  name: 'string',
  arg: '--string',
  env: 'STRING',
  type: stringArg,
}, {
  name: 'list',
  arg: '--list',
  env: 'LIST',
  type: listArg,
}, {
  name: 'boolean',
  arg: ['--boolean', '-b'],
  type: booleanArg,
}, {
  name: 'unspecified',
  arg: '-u',
  required: false
}, {
  name: 'required',
  arg: ['--required', '-r'],
  env: 'REQUIRED',
  type: stringArg,
  required: true
}];

describe('command line forms', function() {

  it('integer', function(t, done) {
    let battery = new TestBattery('integer tests');

    let values;
    try {
      values = parse({
      argv: ['--integer=12', '--required'],
      env: {}}, optionsDef);
    battery.test('accepts integer - long form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;
    } catch (e) {
      battery.test('accepts integer - long form successful parse').fail;
    }

    try {
      values = parse({
        argv: ['-i', '12', '-r'],
        env: {}
      }, optionsDef);
      battery.test('accepts integer - short form')
        .value(values.integer)
        .value(12)
        .is.strictlyEqual
    } catch (e) {
      battery.test('accepts integer - short form successful parse').fail;
    }

    values = parse({
      argv: ['-r'],
      env: {}
    }, optionsDef);
    battery.test('accepts integer - default value')
      .value(values.integer)
      .value(10)
      .is.strictlyEqual;

    values = parse({
      argv: ['-r'],
      env: {INTEGER: '12'}
    }, optionsDef);
    battery.test('integer from environment variable')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;

    battery.done(done);

  });

  it('string', function(t, done) {
    let battery = new TestBattery('string tests');
    let values;

    try {
      values = parse({
        argv: ['--string=pineapple', '--required'],
        env: {},
      }, optionsDef);
      battery.test('accepts string - long form')
        .value(values.string)
        .value('pineapple')
        .is.strictlyEqual;
    } catch (e) {
      battery.test('accepts string - long form successful parse').fail;
    }
    
    try {
      values = parse({
        argv: ['-r'],
        env: {}
      }, optionsDef);
      battery.test('accepts string - no default value')
        .value(values.string)
        .is.undefined;
    } catch (e) {
      battery.test('accepts string - no default value successful parse').fail;
    }

    try {
      values = parse({
        argv: ['-r'],
        env: {STRING: 'pineapple'}
      }, optionsDef);
      battery.test('string from environment variable')
        .value(values.string)
        .value('pineapple')
        .is.strictlyEqual;
    } catch (e) {
      battery.test('string from environment variable successful parse').fail;
    }

    battery.done(done);

  });

  it('list', function(t, done) {
    let battery = new TestBattery('list tests');
    let values;

    try {
      values = parse({
        argv: ['--list=pineapple', '--list=orange', '--required'],
        env: {}
      }, optionsDef);
      battery.test('accepts list - long form array')
        .value(values.list).is.array;
      battery.test('accepts list - long form value 0')
        .value((values.list as string[])[0])
        .value('pineapple')
        .is.strictlyEqual;
      battery.test('accepts list - long form value 1')
        .value((values.list as string[])[1])
        .value('orange')
        .is.strictlyEqual;
    } catch (e) {
      battery.test('accepts list - long form array successful parse').fail;
    }


    try {
      values = parse({
        argv: ['-r'],
        env: {LIST: 'pineapple'}
      }, optionsDef);

      battery.test('list from environment variable')
        .value(values.list).is.array;
      battery.test('list from environment variable value 0')
        .value((values.list as string[])[0])
        .value('pineapple')
        .is.strictlyEqual;
    } catch (e) {
      battery.test('list from environment variable successful parse').fail;
    }

    battery.done(done);

  });

  it('boolean', function(t, done) {
    let battery = new TestBattery('string tests');
    let values;

    try {
      values = parse({
        argv: ['--boolean=false', '--required'],
        env: {}}, optionsDef);
      battery.test('accepts boolean - long form')
        .value(values.boolean)
        .is.false;
    } catch (e) {
      battery.test('accepts boolean - long form successful parse').fail;
    }

    try {
      values = parse({
        argv: ['-b', '-r'],
        env: {}
      }, optionsDef);
      battery.test('accepts boolean - short form, implied true')
        .value(values.boolean)
        .is.true;
    } catch (e) {
      battery.test(
        'accepts boolean - short form, implied true successful parse'
      ).fail;
    }

    try {
      values = parse({
        argv: ['-r'],
        env: {}
      }, optionsDef);
      battery.test('accepts boolean - no default value')
        .value(values.boolean)
        .is.undefined;
    } catch (e) {
      battery.test('accepts boolean - no default value successful parse').fail;
    }

    try {
      values = parse({
        argv: ['--boolean=no', '--required'],
        env: {}}, optionsDef);
      battery.test('accepts boolean - other words for false')
        .value(values.boolean)
        .is.false;
    } catch (e) {
      battery.test(
        'accepts boolean - other words for false successful parse'
      ).fail;
    }  

    try {
      values = parse({
        argv: ['--boolean=yes', '--required'],
        env: {}}, optionsDef);
      battery.test('accepts boolean - other words for true')
        .value(values.boolean)
        .is.true;
    } catch (e) {
      battery.test(
        'accepts boolean - other words for true successful parse'
      ).fail;
    }

    battery.done(done);
  });

  it('unspecified', function(t, done) {
    let battery = new TestBattery('unspecified tests');
    let values;

    try {
      values = parse({
        argv: ['-u', 'pumpernickle', '--required'],
        env: {}}, optionsDef);
      battery.test('accepts unspecified')
        .value(values.unspecified)
        .value('pumpernickle')
        .is.strictlyEqual;
    } catch (e) {
      battery.test(
        'accepts unspecified (default-string) successful parse'
      ).fail;
    }

    battery.done(done);
  });

  it('required', function(t, done) {
    let battery = new TestBattery('required tests');
    let values;

    try {
      values = parse({
        argv: [],
        env: {}}, optionsDef);
      // this is supposed to fail
      battery.test('accepts required - not provided - has errors successful parse').fail;
    } catch (e) {
    }

    const parser = new Parser({argv:[], env:{}}, optionsDef);
    parser.addOptions({
      name: 'list',
      arg: [ '--list-required', '-lr' ],
      type: listArg,
    })
    parser.parse();
    battery.test('accepts required list -- not provided - has errors')
      .value(parser.errors).is.not.nil;
    battery.test('accepts required list -- not provided - has errors')
      .value(parser.errors?.length).value(0).is.not.equal;

    battery.done(done);
  });
});

// describe('argument handlers', function() {
//   it ('changes values', function() {
//     let battery = new TestBattery('required tests');
//     let handler = (name, value, args) => {
//       values[name] = value;
//       if (name === 'list') {
//         let newResult = [];
//         value.forEach(v => {
//           newResult.push.apply(newResult, v.split(','));
//         });
//         values[name] = value;
//         return value;
//       }
//     }
//     let values = {};
//     let errors = parse(optionsDef, {
//       argv: ['-r'],
//       env: {LIST: 'pineapple,orange'},
//       handler
//     });

//     battery.test('accepts required - errors')
//       .value(errors).is.nil;
//     battery.test('list handler')
//       .value(values.list).is.array;
//     battery.test('list handler value 0')
//       .value(values.list[0])
//       .value('pineapple')
//       .is.strictlyEqual;
//     battery.test('list handler value 1')
//       .value(values.list[0])
//       .value('orange')
//       .is.strictlyEqual;
//   });
// })

// describe('exception handling', function() {

//   it('unparseable integer', function(done) {

//     let battery = new TestBattery('unparseable integer tests');

//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let values = {};

//     let errors = parse(optionsDef, {
//       argv: [`--integer=notanumber`, `--required`],
//       env: {},
//       handler
//     });
//     battery.test('reports error is array')
//       .value(errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is a PARSE')
//       .value(_.get(_.first(errors), 'code'))
//       .value('PARSE')
//       .is.equal;
//     battery.test('the error ca is "integer"')
//       .value(_.get(_.first(errors), 'arg.name'))
//       .value('integer')
//       .is.equal;

//     battery.done(done);
//   });

//   it('unparseable boolean', function(done) {

//     let battery = new TestBattery('unparseable integer tests');

//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let values = {};

//     let errors = parse(optionsDef, {
//       argv: [`--boolean=whatever`, `--required`],
//       env: {},
//       handler
//     });
//     battery.test('reports error is array')
//       .value(errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is a PARSE')
//       .value(_.get(_.first(errors), 'code'))
//       .value('PARSE')
//       .is.equal;
//     battery.test('the error ca is "boolean"')
//       .value(_.get(_.first(errors), 'arg.name'))
//       .value('boolean')
//       .is.equal;

//     battery.done(done);
//   });

//   it('unknown parameter', function(done) {

//     let battery = new TestBattery('unknown parameter tests');

//     let parser = new Parser(optionsDef, {
//       argv: [`--unknown=unknowable`, `--required`],
//       env: {}
//     });

//     battery.test('reports error is array')
//       .value(parser.errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(parser.errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is an UNKNOWN_ARG')
//       .value(_.get(_.first(parser.errors), 'code'))
//       .value('UNKNOWN_ARG')
//       .is.equal;
//     battery.test('the argString is the whole argument')
//       .value(_.get(_.first(parser.errors), 'argString'))
//       .value('--unknown=unknowable')
//       .is.equal;

//     parser = new Parser(optionsDef, {
//       argv: [`--required`, `--unknown=unknowable`],
//       env: {},
//       unknown: 'capture'
//     });

//     battery.test('reports error is nil')
//       .value(parser.errors).is.nil;
//     battery.test('unknown-paramter is captured')
//       .value(parser.argv['*'])
//       .value(`--unknown=unknowable`)
//       .are.equal;

//     battery.done(done);
//   });

//   it('unknown type', function(done) {

//     let battery = new TestBattery('unparseable integer tests');

//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let values = {};

//     let badOptionsDef = optionsDef.concat([{
//       name: 'badarg',
//       arg: '-x',
//       type: 'ugly',
//       required: false
//     }])

//     let errors = parse(badOptionsDef, {
//       argv: [`--required`, '-x=wut'],
//       env: {},
//       handler
//     });
//     battery.test('reports error is array')
//       .value(errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is an TYPE_UNKNOWN')
//       .value(_.get(_.first(errors), 'code'))
//       .value('TYPE_UNKNOWN')
//       .is.equal;
//     battery.test('the value is provided')
//       .value(_.get(_.first(errors), 'value'))
//       .value('wut')
//       .is.equal;

//     battery.done(done);
//   });

//   it('validation', function(done) {

//     let battery = new TestBattery('unparseable integer tests');

//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let validator = (name, value, args) => {
//       return (name !== 'required');
//     }
//     let values = {};

//     let errors = parse(optionsDef, {
//       argv: [`--required`],
//       env: {},
//       handler,
//       validator
//     });
//     battery.test('reports error is array')
//       .value(errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is an VALIDATION')
//       .value(_.get(_.first(errors), 'code'))
//       .value('VALIDATION')
//       .is.equal;
//     battery.test('the value is provided')
//       .value(_.get(_.first(errors), 'value'))
//       .value(true)
//       .is.equal;

//     battery.done(done);
//   });
// });

// describe('object form parser', function() {
//   it('integer', function(done) {
//     let battery = new TestBattery('integer tests');
//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let values = {};

//     let parser = new Parser(optionsDef, {
//       argv: ['--integer=12', '--required'],
//       env: {},
//       handler});
//     parser.parse();

//     battery.test('accepts integer - errors')
//       .value(parser.errors).is.nil;
//     battery.test('accepts integer - long form')
//       .value(values.integer)
//       .value(12)
//       .is.strictlyEqual;

//     values = {};

//     parser = new Parser(optionsDef, {
//       argv: ['-i', '12', '-r'],
//       env: {},
//       handler
//     });
//     parser.parse();
//     battery.test('accepts integer - short form')
//       .value(values.integer)
//       .value(12)
//       .is.strictlyEqual

//     battery.done(done);

//   });

//   it('unparseable integer', function(done) {

//     let battery = new TestBattery('unparseable integer tests');

//     let handler = (name, value, args) => {
//       values[name] = value;
//     }
//     let values = {};

//     let parser = new Parser(optionsDef, {
//       argv: [`--integer=notanumber`, `--required`],
//       env: {},
//       handler
//     })
//     parser.parse();
//     let errors = parser.errors;
//     battery.test('reports error is array')
//       .value(errors).is.array;
//     battery.test('reports exactly one error')
//       .value(_.get(errors,'length'))
//       .value(1)
//       .is.equal;
//     battery.test('the error is a PARSE')
//       .value(_.get(_.first(errors), 'code'))
//       .value('PARSE')
//       .is.equal;
//     battery.test('the error ca is "integer"')
//       .value(_.get(_.first(errors), 'arg.name'))
//       .value('integer')
//       .is.equal;

//     battery.done(done);
//   });

// });

// describe('global variables', function() {

//   it('default global variable', function(done) {
//     let battery = new TestBattery('default global variable');
//     delete global.argv;
//     let parser = new Parser(optionsDef, {
//       argv: ['--required'],
//     });
//     parser.parse();
//     battery.test('global.argv exists')
//       .value(global.argv).is.not.undefined;
//     battery.test('global.argv not null')
//       .value(global.argv).is.not.null;
//     battery.test('global.argv.required')
//       .value(global.argv && global.argv.required).is.true;
//     battery.done(done);
//   });

//   it('named global variable', function(done) {
//     let battery = new TestBattery('default global variable');
//     delete global.argv;
//     delete global.myargv;
//     let parser = new Parser(optionsDef, {
//       argv: ['--required'],
//       global: 'myargv'
//     });
//     parser.parse();
//     battery.test('global.argv does not exist')
//       .value(global.argv).is.undefined;
//     battery.test('global.myargv exists')
//       .value(global.myargv).is.not.undefined;
//     battery.test('global.myargv not null')
//       .value(global.myargv).is.not.null;
//     battery.test('global.myargv.required')
//       .value(global.myargv.required).is.true;
//     battery.done(done);
//     });

//   it('no global variable', function(done) {
//     let battery = new TestBattery('no global variable');
//     delete global.argv;
//     let parser = new Parser(optionsDef, {
//       argv: ['--required'],
//       global: null
//     });
//     parser.parse();
//     battery.test('global.argv does not exist')
//       .value(global.argv).is.undefined;
//     battery.done(done);
//     });

// });
