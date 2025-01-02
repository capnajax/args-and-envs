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
describe('command line forms', function () {
    it('integer', function (t, done) {
        let battery = new TestBattery('integer tests');
        let values;
        try {
            values = parse({
                argv: ['--integer=12', '--required'],
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
                argv: ['-i', '12', '-r'],
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
            argv: ['-r'],
            env: {}
        }, optionsDef);
        battery.test('accepts integer - default value')
            .value(values.integer)
            .value(10)
            .is.strictlyEqual;
        values = parse({
            argv: ['-r'],
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
                argv: ['--string=pineapple', '--required'],
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
                argv: ['-r'],
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
                argv: ['-r'],
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
                argv: ['--list=pineapple', '--list=orange', '--required'],
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
                argv: ['-r'],
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
                argv: ['--boolean=false', '--required'],
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
                argv: ['-b', '-r'],
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
                argv: ['-r'],
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
                argv: ['--boolean=no', '--required'],
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
                argv: ['--boolean=yes', '--required'],
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
                argv: ['-u', 'pumpernickle', '--required'],
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
        });
        parser.parse();
        battery.test('accepts required list -- not provided - has errors')
            .value(parser.errors).is.not.nil;
        battery.test('accepts required list -- not provided - has errors')
            .value(parser.errors?.length).value(0).is.not.equal;
        battery.done(done);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3Rlc3QvdGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxZQUFZLENBQUM7QUFFYixPQUFPLFdBQVcsTUFBTSxjQUFjLENBQUM7QUFDdkMsT0FBTyxNQUFNLEVBQUUsRUFBNEIsVUFBVSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3ZILE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXpDLE1BQU0sVUFBVSxHQUFHLENBQUM7UUFDbEIsSUFBSSxFQUFFLFNBQVM7UUFDZixHQUFHLEVBQUUsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQztRQUNqQyxHQUFHLEVBQUUsU0FBUztRQUNkLElBQUksRUFBRSxVQUFVO1FBQ2hCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsT0FBTyxFQUFFLEVBQUU7S0FDWixFQUFFO1FBQ0QsSUFBSSxFQUFFLFFBQVE7UUFDZCxHQUFHLEVBQUUsVUFBVTtRQUNmLEdBQUcsRUFBRSxRQUFRO1FBQ2IsSUFBSSxFQUFFLFNBQVM7S0FDaEIsRUFBRTtRQUNELElBQUksRUFBRSxNQUFNO1FBQ1osR0FBRyxFQUFFLFFBQVE7UUFDYixHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxPQUFPO0tBQ2QsRUFBRTtRQUNELElBQUksRUFBRSxTQUFTO1FBQ2YsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQztRQUN4QixJQUFJLEVBQUUsVUFBVTtLQUNqQixFQUFFO1FBQ0QsSUFBSSxFQUFFLGFBQWE7UUFDbkIsR0FBRyxFQUFFLElBQUk7UUFDVCxRQUFRLEVBQUUsS0FBSztLQUNoQixFQUFFO1FBQ0QsSUFBSSxFQUFFLFVBQVU7UUFDaEIsR0FBRyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQztRQUN6QixHQUFHLEVB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