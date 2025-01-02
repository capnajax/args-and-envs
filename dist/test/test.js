'use strict';
import TestBattery from 'test-battery';
import Parser, { booleanArg, integerArg, listArg, parse, stringArg } from '../src/parser.js';
import { describe, it } from 'node:test';
/**
 * A common set of options for testing with.
 */
const optionsDef = [{
        name: 'integer',
        arg: ['--int', '--integer', '-i'],
        env: 'INTEGER',
        type: integerArg,
        required: false,
        default: 10
    }, {
        name: 'string',
        arg: ['--string'],
        env: 'STRING',
        type: stringArg,
    }, {
        name: 'list',
        arg: ['--list'],
        env: 'LIST',
        type: listArg,
    }, {
        name: 'boolean',
        arg: ['--boolean', '-b'],
        type: booleanArg,
    }, {
        name: 'unspecified',
        arg: ['-u'],
        required: false
    }, {
        name: 'required',
        arg: ['--required', '-r'],
        env: 'REQUIRED',
        type: stringArg,
        required: true
    }];
describe('options definition validation', function () {
    it.todo('rejects arguments with no name');
    it.todo('rejects invalid argument types');
    it.todo('rejects required arguments with default values');
    it.todo('rejects if there are more than one `positional` or `--` arguments');
    it.todo('rejects defaults of an incorrect type');
    it.todo('rejects handlers with an incorrect signature');
    it.todo('rejects validators with an incorrect signature');
});
describe('argument normalization exception handling', function () {
    it.todo('unparseable integer');
    it.todo('unparseable boolean');
    it.todo('unknown parameter');
});
describe('command line context', function () {
    it.todo('bare booleans without capturing following argument');
    it.todo('bare arguments must be detected');
    it.todo('double-dash captures all following arguments');
    it.todo('double-dash with post-options captures all arguments as such');
});
describe('command line forms', function () {
    it('integer', function (t, done) {
        let battery = new TestBattery('integer tests');
        let values;
        try {
            values = parse({
                argv: ['--integer=12', '--required=ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts integer - long form')
                .value(values.integer)
                .value(12)
                .is.strictlyEqual;
        }
        catch (e) {
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
                .is.strictlyEqual;
        }
        catch (e) {
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
            env: { INTEGER: '12' }
        }, optionsDef);
        battery.test('integer from environment variable')
            .value(values.integer)
            .value(12)
            .is.strictlyEqual;
        battery.done(done);
    });
    it('string', function (t, done) {
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
        }
        catch (e) {
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
        }
        catch (e) {
            battery.test('accepts string - no default value successful parse').fail;
        }
        try {
            values = parse({
                argv: ['-r', 'ok'],
                env: { STRING: 'pineapple' }
            }, optionsDef);
            battery.test('string from environment variable')
                .value(values.string)
                .value('pineapple')
                .is.strictlyEqual;
        }
        catch (e) {
            battery.test('string from environment variable successful parse').fail;
        }
        battery.done(done);
    });
    it('list', function (t, done) {
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
                .value(values.list[0])
                .value('pineapple')
                .is.strictlyEqual;
            battery.test('accepts list - long form value 1')
                .value(values.list[1])
                .value('orange')
                .is.strictlyEqual;
        }
        catch (e) {
            battery.test('accepts list - long form array successful parse').fail;
        }
        try {
            values = parse({
                argv: ['-r', 'ok'],
                env: { LIST: 'pineapple' }
            }, optionsDef);
            battery.test('list from environment variable')
                .value(values.list).is.array;
            battery.test('list from environment variable value 0')
                .value(values.list[0])
                .value('pineapple')
                .is.strictlyEqual;
        }
        catch (e) {
            battery.test('list from environment variable successful parse').fail;
        }
        battery.done(done);
    });
    it('boolean', function (t, done) {
        let battery = new TestBattery('string tests');
        let values;
        try {
            values = parse({
                argv: ['--boolean=false', '--required=ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts boolean - long form')
                .value(values.boolean)
                .is.false;
        }
        catch (e) {
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
        }
        catch (e) {
            battery.test('accepts boolean - short form, implied true successful parse').fail;
        }
        try {
            values = parse({
                argv: ['-r', 'ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts boolean - no default value')
                .value(values.boolean)
                .is.undefined;
        }
        catch (e) {
            battery.test('accepts boolean - no default value successful parse').fail;
        }
        try {
            values = parse({
                argv: ['--boolean=no', '--required=ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts boolean - other words for false')
                .value(values.boolean)
                .is.false;
        }
        catch (e) {
            battery.test('accepts boolean - other words for false successful parse').fail;
        }
        try {
            values = parse({
                argv: ['--boolean=yes', '--required=ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts boolean - other words for true')
                .value(values.boolean)
                .is.true;
        }
        catch (e) {
            battery.test('accepts boolean - other words for true successful parse').fail;
        }
        battery.done(done);
    });
    it('unspecified', function (t, done) {
        let battery = new TestBattery('unspecified tests');
        let values;
        try {
            values = parse({
                argv: ['-u', 'pumpernickle', '--required=ok'],
                env: {}
            }, optionsDef);
            battery.test('accepts unspecified')
                .value(values.unspecified)
                .value('pumpernickle')
                .is.strictlyEqual;
        }
        catch (e) {
            battery.test('accepts unspecified (default-string) successful parse').fail;
        }
        battery.done(done);
    });
    it('required', function (t, done) {
        let battery = new TestBattery('required tests');
        let values;
        try {
            values = parse({
                argv: [],
                env: {}
            }, optionsDef);
            // this is supposed to fail
            battery.test('accepts required - not provided - has errors successful parse').fail;
        }
        catch (e) {
        }
        const parser = new Parser({ argv: [], env: {} }, optionsDef);
        parser.addOptions({
            name: 'list',
            arg: ['--list-required', '-lr'],
            type: listArg,
            required: true
        });
        parser.parse();
        battery.test('accepts required list -- not provided - has errors')
            .value(parser.errors).is.not.nil;
        battery.test('accepts required list -- not provided - has errors')
            .value(parser.errors?.length).value(0).is.not.equal;
        battery.done(done);
    });
    it('positional arguments', function (t, done) {
        let battery = new TestBattery('positional tests');
        const parser = new Parser({
            argv: ['--required', 'ok', 'myfile.txt', 'yourfile.txt', 'herfile.txt'],
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
            .value(parser.args.positional[0])
            .value('myfile.txt').is.strictlyEqual;
        battery.test('positional param 1')
            .value(parser.args.positional[1])
            .value('yourfile.txt').is.strictlyEqual;
        battery.done(done);
    });
});
describe('argument handlers', function () {
    it.todo('handlers that return same type');
    it.todo('handlers that return different type');
    it.todo('handlers that defer to next handler');
});
describe.todo('argument validation', () => {
    it.todo('validation');
    it.todo('validation with handler');
    it.todo('validation of positional arguments');
});
describe.todo('global variables', function () {
    it.todo('global variable set');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixPQUFPLFdBQVcsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxNQUFNLEVBQUUsRUFBNEIsVUFBVSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXpDOztHQUVHO0FBQ0gsTUFBTSxVQUFVLEdBQUcsQ0FBQztRQUNsQixJQUFJLEVBQUUsU0FBUztRQUNmLEdBQUcsRUFBRSxDQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFFO1FBQ25DLEdBQUcsRUFBRSxTQUFTO1FBQ2QsSUFBSSxFQUFFLFVBQVU7UUFDaEIsUUFBUSxFQUFFLEtBQUs7UUFDZixPQUFPLEVBQUUsRUFBRTtLQUNaLEVBQUU7UUFDRCxJQUFJLEVBQUUsUUFBUTtRQUNkLEdBQUcsRUFBRSxDQUFFLFVBQVUsQ0FBRTtRQUNuQixHQUFHLEVBQUUsUUFBUTtRQUNiLElBQUksRUFBRSxTQUFTO0tBQ2hCLEVBQUU7UUFDRCxJQUFJLEVBQUUsTUFBTTtRQUNaLEdBQUcsRUFBRSxDQUFFLFFBQVEsQ0FBRTtRQUNqQixHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxPQUFPO0tBQ2QsRUFBRTtRQUNELElBQUksRUFBRSxTQUFTO1FBQ2YsR0FBRyxFQUFFLENBQUUsV0FBVyxFQUFFLElBQUksQ0FBRTtRQUMxQixJQUFJLEVBQUUsVUFBVTtLQUNqQixFQUFFO1FBQ0QsSUFBSSxFQUFFLGFBQWE7UUFDbkIsR0FBRyxFQUFFLENBQUUsSUFBSSxDQUFFO1FBQ2IsUUFBUSxFQUFFLEtBQUs7S0FDaEIsRUFBRTtRQUNELElBQUksRUFBRSxVQUFVO1FBQ2hCLEdBQUcs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