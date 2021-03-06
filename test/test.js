'use strict';

import TestBattery from 'test-battery';
import Parser, { parse } from '../index.js';
import _ from 'lodash';

const optionsDef = [{
  name: 'integer',
  arg: ['--int', '--integer', '-i'],
  env: 'INTEGER',
  type: 'integer',
  required: false,
  default: 10
}, {
  name: 'string',
  arg: '--string',
  env: 'STRING',
  type: 'string'
}, {
  name: 'list',
  arg: '--list',
  env: 'LIST',
  type: 'list'
}, {
  name: 'boolean',
  arg: ['--boolean', '-b'],
  type: 'boolean',
}, {
  name: 'unspecified',
  arg: '-u',
  required: false
}, {
  name: 'required',
  arg: ['--required', '-r'],
  env: 'REQUIRED',
  type: 'boolean',
  required: true
}];

describe('command line forms', function() {

  it('integer', function(done) {
    let battery = new TestBattery('integer tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--integer=12', '--required'],
      env: {},
      handler});
    battery.test('accepts integer - errors')
      .value(errors).is.nil;
    battery.test('accepts integer - long form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-i', '12', '-r'],
      env: {},
      handler
    });
    battery.test('accepts integer - short form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {},
      handler
    });
    battery.test('accepts integer - default value')
      .value(values.integer)
      .value(10)
      .is.strictlyEqual;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {INTEGER: 12},
      handler
    });
    battery.test('integer from environment variable')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;

    battery.done(done);

  });

  it('string', function(done) {
    let battery = new TestBattery('string tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--string=pineapple', '--required'],
      env: {},
      handler});
    battery.test('accepts string - errors')
      .value(errors).is.nil;
    battery.test('accepts string - long form')
      .value(values.string)
      .value('pineapple')
      .is.strictlyEqual;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {},
      handler
    });
    battery.test('accepts string - no default value')
      .value(values.string)
      .is.undefined;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {STRING: 'pineapple'},
      handler
    });
    battery.test('string from environment variable')
      .value(values.string)
      .value('pineapple')
      .is.strictlyEqual;

    battery.done(done);

  });
  
  it('list', function(done) {
    let battery = new TestBattery('list tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--list=pineapple', '--list=orange', '--required'],
      env: {},
      handler});
    battery.test('accepts list - errors')
      .value(errors).is.nil;
    battery.test('accepts list - long form array')
      .value(values.list).is.array;

    battery.test('accepts list - long form value 0')
      .value(values.list[0])
      .value('pineapple')
      .is.strictlyEqual;
    battery.test('accepts list - long form value 1')
      .value(values.list[1])
      .value('orange')
      .is.strictlyEqual;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {LIST: 'pineapple'},
      handler
    });

    battery.test('list from environment variable')
      .value(values.list).is.array;
    battery.test('list from environment variable value 0')
      .value(values.list[0])
      .value('pineapple')
      .is.strictlyEqual;

    battery.done(done);

  });
  
  it('boolean', function(done) {
    let battery = new TestBattery('string tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--boolean=false', '--required'],
      env: {},
      handler});
    battery.test('accepts boolean - errors')
      .value(errors).is.nil;
    battery.test('accepts boolean - long form')
      .value(values.boolean)
      .is.false;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-b', '-r'],
      env: {},
      handler
    });
    battery.test('accepts boolean - short form, implied true')
      .value(values.boolean)
      .is.true;

    values = {};
    errors = parse(optionsDef, {
      argv: ['-r'],
      env: {},
      handler
    });
    battery.test('accepts boolean - no default value')
      .value(values.boolean)
      .is.undefined;

    errors = parse(optionsDef, {
      argv: ['--boolean=no', '--required'],
      env: {},
      handler});
    battery.test('accepts boolean - other words for false')
      .value(values.boolean)
      .is.false;
    
    errors = parse(optionsDef, {
      argv: ['--boolean=yes', '--required'],
      env: {},
      handler});
    battery.test('accepts boolean - other words for true')
      .value(values.boolean)
      .is.true;
   
    battery.done(done);
  });
  
  it('unspecified', function(done) {
    let battery = new TestBattery('unspecified tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['-u', 'pumpernickle', '--required'],
      env: {},
      handler});
    battery.test('accepts unspecified - errors')
      .value(errors).is.nil;
    battery.test('accepts unspecified')
      .value(values.unspecified)
      .value('pumpernickle')
      .is.strictlyEqual;

    battery.done(done);
  });

  it('required', function(done) {
    let battery = new TestBattery('required tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--required'],
      env: {},
      handler});
    battery.test('accepts required - errors')
      .value(errors).is.nil;
    battery.test('accepts required, implied true')
      .value(values.required)
      .is.true;

    errors = parse(optionsDef, {
      argv: ['--required=true'],
      env: {},
      handler});
    battery.test('accepts required true')
      .value(values.required)
      .is.true;
  
    errors = parse(optionsDef, {
      argv: ['--required=false'],
      env: {},
      handler});
    battery.test('accepts required false')
      .value(values.required)
      .is.false;
    
    errors = parse(optionsDef, {
      argv: [],
      env: {},
      handler});
    battery.test('accepts required - not provided - has errors')
      .value(errors).is.array;
    battery.test('accepts required - not provided - has errors')
      .value(_.get(errors, 'length')).value(1).is.strictlyEqual;

    battery.done(done);
  });  
});

describe('argument handlers', function() {
  it ('changes values', function() {
    let battery = new TestBattery('required tests');
    let handler = (name, value, args) => {      
      values[name] = value;
      if (name === 'list') {
        let newResult = [];
        value.forEach(v => {
          newResult.push.apply(newResult, v.split(','));
        });
        values[name] = value;
        return value;
      }
    }
    let values = {};
    let errors = parse(optionsDef, {
      argv: ['-r'],
      env: {LIST: 'pineapple,orange'},
      handler
    });

    battery.test('accepts required - errors')
      .value(errors).is.nil;
    battery.test('list handler')
      .value(values.list).is.array;
    battery.test('list handler value 0')
      .value(values.list[0])
      .value('pineapple')
      .is.strictlyEqual;
    battery.test('list handler value 1')
      .value(values.list[0])
      .value('orange')
      .is.strictlyEqual;
  });
})

describe('exception handling', function() {

  it('unparseable integer', function(done) {

    let battery = new TestBattery('unparseable integer tests');

    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};
  
    let errors = parse(optionsDef, {
      argv: [`--integer=notanumber`, `--required`],
      env: {},
      handler
    });  
    battery.test('reports error is array')
      .value(errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is a PARSE')
      .value(_.get(_.first(errors), 'code'))
      .value('PARSE')
      .is.equal;
    battery.test('the error ca is "integer"')
      .value(_.get(_.first(errors), 'arg.name'))
      .value('integer')
      .is.equal;

    battery.done(done);
  });

  it('unparseable boolean', function(done) {

    let battery = new TestBattery('unparseable integer tests');

    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};
  
    let errors = parse(optionsDef, {
      argv: [`--boolean=whatever`, `--required`],
      env: {},
      handler
    });  
    battery.test('reports error is array')
      .value(errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is a PARSE')
      .value(_.get(_.first(errors), 'code'))
      .value('PARSE')
      .is.equal;
    battery.test('the error ca is "boolean"')
      .value(_.get(_.first(errors), 'arg.name'))
      .value('boolean')
      .is.equal;

    battery.done(done);
  });

  it('unknown parameter', function(done) {

    let battery = new TestBattery('unknown parameter tests');

    let parser = new Parser(optionsDef, {
      argv: [`--unknown=unknowable`, `--required`],
      env: {}
    });

    battery.test('reports error is array')
      .value(parser.errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(parser.errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is an UNKNOWN_ARG')
      .value(_.get(_.first(parser.errors), 'code'))
      .value('UNKNOWN_ARG')
      .is.equal;
    battery.test('the argString is the whole argument')
      .value(_.get(_.first(parser.errors), 'argString'))
      .value('--unknown=unknowable')
      .is.equal;

    parser = new Parser(optionsDef, {
      argv: [`--required`, `--unknown=unknowable`],
      env: {},
      unknown: 'capture'
    });

    battery.test('reports error is nil')
      .value(parser.errors).is.nil;
    battery.test('unknown-paramter is captured')
      .value(parser.argv['*'])
      .value(`--unknown=unknowable`)
      .are.equal;
  
    battery.done(done);
  });

  it('unknown type', function(done) {

    let battery = new TestBattery('unparseable integer tests');

    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let badOptionsDef = optionsDef.concat([{
      name: 'badarg',
      arg: '-x',
      type: 'ugly',
      required: false
    }])
  
    let errors = parse(badOptionsDef, {
      argv: [`--required`, '-x=wut'],
      env: {},
      handler
    });  
    battery.test('reports error is array')
      .value(errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is an TYPE_UNKNOWN')
      .value(_.get(_.first(errors), 'code'))
      .value('TYPE_UNKNOWN')
      .is.equal;
    battery.test('the value is provided')
      .value(_.get(_.first(errors), 'value'))
      .value('wut')
      .is.equal;

    battery.done(done);
  });

  it('validation', function(done) {

    let battery = new TestBattery('unparseable integer tests');

    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let validator = (name, value, args) => { 
      return (name !== 'required');
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: [`--required`],
      env: {},
      handler,
      validator
    });  
    battery.test('reports error is array')
      .value(errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is an VALIDATION')
      .value(_.get(_.first(errors), 'code'))
      .value('VALIDATION')
      .is.equal;
    battery.test('the value is provided')
      .value(_.get(_.first(errors), 'value'))
      .value(true)
      .is.equal;

    battery.done(done);
  });
});

describe('object form parser', function() {
  it('integer', function(done) {
    let battery = new TestBattery('integer tests');
    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};

    let parser = new Parser(optionsDef, {
      argv: ['--integer=12', '--required'],
      env: {},
      handler});
    parser.parse();

    battery.test('accepts integer - errors')
      .value(parser.errors).is.nil;
    battery.test('accepts integer - long form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;

    values = {};

    parser = new Parser(optionsDef, {
      argv: ['-i', '12', '-r'],
      env: {},
      handler
    });
    parser.parse();
    battery.test('accepts integer - short form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual

    battery.done(done);

  });
  
  it('unparseable integer', function(done) {

    let battery = new TestBattery('unparseable integer tests');

    let handler = (name, value, args) => {      
      values[name] = value;
    }
    let values = {};
  
    let parser = new Parser(optionsDef, {
      argv: [`--integer=notanumber`, `--required`],
      env: {},
      handler
    })
    parser.parse();
    let errors = parser.errors;
    battery.test('reports error is array')
      .value(errors).is.array;
    battery.test('reports exactly one error')
      .value(_.get(errors,'length'))
      .value(1)
      .is.equal;
    battery.test('the error is a PARSE')
      .value(_.get(_.first(errors), 'code'))
      .value('PARSE')
      .is.equal;
    battery.test('the error ca is "integer"')
      .value(_.get(_.first(errors), 'arg.name'))
      .value('integer')
      .is.equal;

    battery.done(done);
  });

});

describe('global variables', function() {

  it('default global variable', function(done) {
    let battery = new TestBattery('default global variable');
    delete global.argv;
    let parser = new Parser(optionsDef, {
      argv: ['--required'],
    });
    parser.parse();
    battery.test('global.argv exists')
      .value(global.argv).is.not.undefined;
    battery.test('global.argv not null')
      .value(global.argv).is.not.null;
    battery.test('global.argv.required')
      .value(global.argv && global.argv.required).is.true;
    battery.done(done);
  });

  it('named global variable', function(done) {
    let battery = new TestBattery('default global variable');
    delete global.argv;
    delete global.myargv;
    let parser = new Parser(optionsDef, {
      argv: ['--required'],
      global: 'myargv'
    });
    parser.parse();
    battery.test('global.argv does not exist')
      .value(global.argv).is.undefined;
    battery.test('global.myargv exists')
      .value(global.myargv).is.not.undefined;
    battery.test('global.myargv not null')
      .value(global.myargv).is.not.null;
    battery.test('global.myargv.required')
      .value(global.myargv.required).is.true;
    battery.done(done);
    });

  it('no global variable', function(done) {
    let battery = new TestBattery('no global variable');
    delete global.argv;
    let parser = new Parser(optionsDef, {
      argv: ['--required'],
      global: null
    });
    parser.parse();
    battery.test('global.argv does not exist')
      .value(global.argv).is.undefined;
    battery.done(done);
    });

});