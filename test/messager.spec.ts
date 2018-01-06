describe('Messager', () => {

    let msgr;
    let id;
    let date;
    let verb;
    let source;
    let payload;
    let simpleMessage;

    beforeEach(() => {
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
    })

    it('send creates a Guid', () => {
        spyOn(msgr, 'createGuid');
        msgr.send(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalledWith();
    });

    it('send creates a message', () => {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');
        msgr.send(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id,
            MessageType.Request, payload);
    });

    it('send posts a message', () => {
        spyOn(msgr, 'createMessage').and.returnValue(simpleMessage);
        spyOn(msgr, 'postMessage');
        msgr.send(verb, payload);
        expect(msgr.postMessage).toHaveBeenCalledWith(simpleMessage);
    });

    it('send returns a Promise', () => {
        expect(msgr.send(verb, payload)).toEqual(jasmine.any(Promise));
    });

    // it('receive message with no origin throws error', () => {;
    //     expect(() => { msgr.receiveMessage(simpleMessage) })
    //         .toThrow();
    // });

    it('validate message with missing property should return error', () => {
        const structure = {
            mandatory: 'string'
        };
        const errors = msgr.validateMessage(simpleMessage, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Missing message property mandatory');
    });

    it('validate message with invalid type should return error', () => {
        const structure = {
            payload: 'number'
        };

        const errors = msgr.validateMessage(simpleMessage, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property payload is a string instead of a number');
    });

    it('validate message with an invalid array value should return error', () => {
        const message = {
            type: 'REQUESt'
        };

        const structure = {
            type: ['REQUEST', 'RESPONSE']
        };

        const errors = msgr.validateMessage(message, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property type with a value of REQUESt is not a valid value for REQUEST,RESPONSE');

    });

    it('validate message with an invalid sub-object properties should return error', () => {
        const message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def',
                testFunkyType: 'xyz'
            }
        };

        const structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string',
                testFunkyType: null
            }
        };

        const errors = msgr.validateMessage(message, structure);
        // console.log(errors);
        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Message property testNumber is a string instead of a number');

    });

});