'use strict';
import TestBattery from 'test-battery';
import Parser, { booleanArg, integerArg, listArg, parse, stringArg } from '../src/parser.js';
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
describe('regular exception handling', function () {
    it.todo('unparseable integer');
    it.todo('unparseable boolean');
    it.todo('unknown parameter');
});
describe.todo('argument validation', () => {
    it.todo('validation');
    it.todo('validation with handler');
    it.todo('validation of positional arguments');
});
describe.todo('global variables', function () {
    it.todo('global variable set');
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixPQUFPLFdBQVcsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxNQUFNLEVBQUUsRUFBNEIsVUFBVSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXpDLE1BQU0sVUFBVSxHQUFHLENBQUM7UUFDbEIsSUFBSSxFQUFFLFNBQVM7UUFDZixHQUFHLEVBQUUsQ0FBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBRTtRQUNuQyxHQUFHLEVBQUUsU0FBUztRQUNkLElBQUksRUFBRSxVQUFVO1FBQ2hCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsT0FBTyxFQUFFLEVBQUU7S0FDWixFQUFFO1FBQ0QsSUFBSSxFQUFFLFFBQVE7UUFDZCxHQUFHLEVBQUUsQ0FBRSxVQUFVLENBQUU7UUFDbkIsR0FBRyxFQUFFLFFBQVE7UUFDYixJQUFJLEVBQUUsU0FBUztLQUNoQixFQUFFO1FBQ0QsSUFBSSxFQUFFLE1BQU07UUFDWixHQUFHLEVBQUUsQ0FBRSxRQUFRLENBQUU7UUFDakIsR0FBRyxFQUFFLE1BQU07UUFDWCxJQUFJLEVBQUUsT0FBTztLQUNkLEVBQUU7UUFDRCxJQUFJLEVBQUUsU0FBUztRQUNmLEdBQUcsRUFBRSxDQUFFLFdBQVcsRUFBRSxJQUFJLENBQUU7UUFDMUIsSUFBSSxFQUFFLFVBQVU7S0FDakIsRUFBRTtRQUNELElBQUksRUFBRSxhQUFhO1FBQ25CLEdBQUcsRUFBRSxDQUFFLElBQUksQ0FBRTtRQUNiLFFBQVEsRUFBRSxLQUFLO0tBQ2hCLEVBQUU7UUFDRCxJQUFJLEVBQUUsVUFBVTtRQUNoQixHQUFHLEVBQUUsQ0FBRSxZ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