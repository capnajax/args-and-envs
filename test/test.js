'use strict';

import TestBattery from 'test-battery';
import parse from '../index.js';

describe('command line forms', function() {

  let optionsDef = [{
    name: 'integer',
    arg: ['--int', '--integer', '-i'],
    env: 'INTEGER',
    type: 'integer',
    required: false,
    default: 10
  }, {
    name: 'string',
    arg: ['--str', '--string', '-s'],
    env: 'STRING',
    type: 'string'
  }, {
    name: 'boolean',
    arg: '--boolean',
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

  it('integer', function(done) {
    let battery = new TestBattery('integer tests');
    let handler = (name, args) => {
      values[name] = args[name];
    }
    let values = {};

    let errors = parse(optionsDef, {
      argv: ['--integer=12'],
      env: {}
    }, {handler});
    battery.test('accepts integer - errors')
      .value(errors).is.nil;
    battery.test('accepts integer - long form')
      .value(values.integer)
      .value(12)
      .is.strictlyEqual;

    global.args = {};
    errors = parse(optionsDef, {
      argv: ['-i 12'],
      env: {}
    });
    battery.test('accepts integer - short form')
      .value(global.args.integer)
      .value(12)

    global.args = {};
    errors = parse(optionsDef, {
      argv: [],
      env: {}
    });
    battery.test('accepts integer - default value')
      .value(global.args.integer)
      .value(10)
      .is.strictlyEqual;

    battery.done(done);

  });

});
