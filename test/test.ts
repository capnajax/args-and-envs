'use strict';

import TestBattery from 'test-battery';
import Parser, { argTypeName, ArgTypeName, booleanArg, integerArg, listArg, parse, stringArg } from '../src/parser.js';
import { describe, it } from 'node:test';

/**
 * A common set of options for testing with.
 */
const optionsDef = [{
  name: 'integer',
  arg: [ '--int', '--integer', '-i' ],
  env: 'INTEGER',
  type: integerArg,
  required: false,
  default: 10
}, {
  name: 'string',
  arg: [ '--string' ],
  env: 'STRING',
  type: stringArg,
}, {
  name: 'list',
  arg: [ '--list' ],
  env: 'LIST',
  type: listArg,
}, {
  name: 'boolean',
  arg: [ '--boolean', '-b' ],
  type: booleanArg,
}, {
  name: 'unspecified',
  arg: [ '-u' ],
  required: false
}, {
  name: 'required',
  arg: [ '--required', '-r' ],
  env: 'REQUIRED',
  type: stringArg,
  required: true
}];

describe('options definition validation', function() {
  it.todo('rejects arguments with no name');
  it.todo('rejects invalid argument types');
  it.todo('rejects required arguments with default values');
  it.todo('rejects if there are more than one `positional` or `--` arguments');
  it.todo('rejects defaults of an incorrect type');
  it.todo('rejects handlers with an incorrect signature');
  it.todo('rejects validators with an incorrect signature');
});

describe('argument normalization exception handling', function() {
  it.todo('unparseable integer');
  it.todo('unparseable boolean');
  it.todo('unknown parameter');
});

describe('command line context', function() {
  it.todo('bare booleans without capturing following argument');
  it.todo('bare arguments must be detected');
  it.todo('double-dash captures all following arguments');
  it.todo('double-dash with post-options captures all arguments as such');
});

describe('command line forms', function() {

  it('integer', function(t, done) {
    let battery = new TestBattery('integer tests');

    let values;
    try {
      values = parse({
      argv: ['--integer=12', '--required=ok'],
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
        argv: ['-i', '12', '-r', 'ok'],
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
      argv: ['-r', 'ok'],
      env: {}
    }, optionsDef);
    battery.test('accepts integer - default value')
      .value(values.integer)
      .value(10)
      .is.strictlyEqual;

    values = parse({
      argv: ['-r', 'ok'],
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
        argv: ['--string=pineapple', '--required=ok'],
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
        argv: ['-r', 'ok'],
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
        argv: ['-r', 'ok'],
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
        argv: ['--list=pineapple', '--list=orange', '--required=ok'],
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
        argv: ['-r', 'ok'],
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
        argv: ['--boolean=false', '--required=ok'],
        env: {}}, optionsDef);
      battery.test('accepts boolean - long form')
        .value(values.boolean)
        .is.false;
    } catch (e) {
      battery.test('accepts boolean - long form successful parse').fail;
    }

    try {
      values = parse({
        argv: ['-b', '-r', 'ok'],
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
        argv: ['-r', 'ok'],
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
        argv: ['--boolean=no', '--required=ok'],
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
        argv: ['--boolean=yes', '--required=ok'],
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
        argv: ['-u', 'pumpernickle', '--required=ok'],
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
      battery.test(
        'accepts required - not provided - has errors successful parse'
      ).fail;
    } catch (e) {
    }

    const parser = new Parser({argv:[], env:{}}, optionsDef);
    parser.addOptions({
      name: 'list',
      arg: [ '--list-required', '-lr' ],
      type: listArg,
      required: true
    })
    parser.parse();
    battery.test('accepts required list -- not provided - has errors')
      .value(parser.errors).is.not.nil;
    battery.test('accepts required list -- not provided - has errors')
      .value(parser.errors?.length).value(0).is.not.equal;

    battery.done(done);
  });

  it('positional arguments', function(t, done) {
    let battery = new TestBattery('positional tests');

    const parser = new Parser({
      argv: [ '--required', 'ok', 'myfile.txt', 'yourfile.txt', 'herfile.txt' ],
      env: {}
    }, optionsDef);
    parser.addOptions({
      name: 'positional',
      arg: 'positional'
    });
    const hasError = !parser.parse();
    console.log('hasError:', hasError);
    console.log('parser.args:', parser.args);
    console.log('parser.errors:', parser.errors);
    battery.test('positional type has no errors')
      .value(hasError).is.false;
    battery.endIfErrors();
    battery.test('positional type defaults to array')
      .value(parser.args.positional).is.array;
    battery.test('positional param 0')
      .value((parser.args.positional as string[])[0])
      .value('myfile.txt').is.strictlyEqual;
    battery.test('positional param 1')
      .value((parser.args.positional as string[])[1])
      .value('yourfile.txt').is.strictlyEqual;

    battery.done(done);
  });

});

describe('argument handlers', function() {
  it.todo('handlers that return same type');
  it.todo('handlers that return different type');
  it.todo('handlers that defer to next handler');
});

describe.todo('argument validation', () => {
  it.todo('validation');
  it.todo('validation with handler');
  it.todo('validation of positional arguments');
});

describe.todo('global variables', function() {
  it.todo('global variable set');
});
