describe('Messager', function () {
    var msgr;
    var id;
    var date;
    var verb;
    var source;
    var payload;
    var simpleMessage;
    beforeEach(function () {
        msgr = new Messager({
            targetWindow: window.parent,
            targetOrigin: '*',
            source: source
        });
        id = '123';
        date = new Date(2018, 1, 1);
        verb = 'TESTVERB';
        source = 'TestSource';
        payload = { test: 'abc' };
        simpleMessage = {
            payload: 'abc'
        };
    });
    it('send creates a Guid', function () {
        spyOn(msgr, 'createGuid');
        msgr.send(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalledWith();
    });
    it('send creates a message', function () {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');
        msgr.send(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id, MessageType.Request, payload);
    });
    it('send posts a message', function () {
        spyOn(msgr, 'createMessage').and.returnValue(simpleMessage);
        spyOn(msgr, 'postMessage');
        msgr.send(verb, payload);
        expect(msgr.postMessage).toHaveBeenCalledWith(simpleMessage);
    });
    it('send returns a Promise', function () {
        expect(msgr.send(verb, payload)).toEqual(jasmine.any(Promise));
    });
    // it('receive message with no origin throws error', () => {;
    //     expect(() => { msgr.receiveMessage(simpleMessage) })
    //         .toThrow();
    // });
    it('validate message with missing property should return error', function () {
        var structure = {
            mandatory: 'string'
        };
        var errors = msgr.validateMessage(simpleMessage, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Missing message property mandatory');
    });
    it('validate message with invalid type should return error', function () {
        var structure = {
            payload: 'number'
        };
        var errors = msgr.validateMessage(simpleMessage, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property payload is a string instead of a number');
    });
    it('validate message with an invalid array value should return error', function () {
        var message = {
            type: 'REQUESt'
        };
        var structure = {
            type: ['REQUEST', 'RESPONSE']
        };
        var errors = msgr.validateMessage(message, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property type with a value of REQUESt is not a valid value for REQUEST,RESPONSE');
    });
    it('validate message with an invalid sub-object properties should return error', function () {
        var message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def',
                testFunkyType: 'xyz'
            }
        };
        var structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string',
                testFunkyType: null
            }
        };
        var errors = msgr.validateMessage(message, structure);
        // console.log(errors);
        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Message property testNumber is a string instead of a number');
    });
});
//# sourceMappingURL=messager.spec.js.map