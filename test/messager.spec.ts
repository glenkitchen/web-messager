describe('Messager', () => {

    let msgr;
    let verb;
    let id;
    let date;
    let source;
    let payload;
    let message;

    beforeEach(() => {

        msgr = new Messager({
            targetWindow: window.parent,
            targetOrigin: '*',
            messageSource: source,
            mustLogInfo: false,
            mustLogError: false
        });

        verb = 'TESTVERB';
        id = '123';
        date = new Date(2018, 1, 1);
        source = 'TestSource';
        payload = { test: 'abc' };

        message = {
            origin: '*',
            data: {
                verb: verb,
                id: id,
                date: date,
                source: source,
                payload: payload
            }
        };
    })

    it('sendMessage without verb throws error', () => {

        expect(() => { msgr.sendMessage(null) })
            .toThrowError('Invalid verb parameter');
    });

    it('sendMessage creates a Guid', () => {

        spyOn(msgr, 'createGuid');

        msgr.sendMessage(verb, payload);

        expect(msgr.createGuid).toHaveBeenCalledWith();
    });

    it('sendMessage creates a message', () => {

        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');

        msgr.sendMessage(verb, payload);

        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id,
            MessageType.Request, payload);
    });

    it('sendMessage creates a promise function', () => {

        spyOn(msgr, 'createPromiseFunction');

        msgr.sendMessage(verb, payload);

        expect(msgr.createPromiseFunction).toHaveBeenCalled();
    });

    it('sendMessage posts a message', () => {

        const msg = {
            payload: 'abc'
        };
        spyOn(msgr, 'createMessage').and.returnValue(msg);
        spyOn(msgr, 'postMessage');

        msgr.sendMessage(verb, payload);

        expect(msgr.postMessage).toHaveBeenCalledWith(msg);
    });

    it('sendMessage returns a Promise', () => {
        expect(msgr.sendMessage(verb, payload)).toEqual(jasmine.any(Promise));
    });

    it('validateMessage with a missing property should return error', () => {

        const msg = {
            payload: 'abc'
        };
        const structure = {
            mandatory: 'string'
        };

        const errors = msgr.validateMessage(msg, structure);

        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Missing message property mandatory');
    });

    it('validateMessage with an invalid type should return error', () => {

        const msg = {
            payload: 'abc'
        };
        const structure = {
            payload: 'number'
        };

        const errors = msgr.validateMessage(msg, structure);

        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property payload is a string instead of a number');
    });

    it('validateMessage with an invalid array value should return error', () => {

        const message = {
            type: 'REQUESt'
        };
        const structure = {
            type: ['REQUEST', 'RESPONSE']
        };

        const errors = msgr.validateMessage(message, structure);

        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain(
            'Message property type with a value of REQUESt is not a valid value for REQUEST,RESPONSE');

    });

    it('validateMessage with an invalid sub-object properties should return error', () => {

        const message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def'
            }
        };
        const structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string'
            }
        };

        const errors = msgr.validateMessage(message, structure);

        // console.log(errors);
        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Message property testNumber is a string instead of a number');

    });

    it('validateMessage with a null structure type should NOT return error', () => {

        const message = {
            test: 'abc'
        };
        const structure = {
            test: null
        };

        const errors = msgr.validateMessage(message, structure);

        // console.log(errors);
        expect(errors.length).toEqual(0);
    });

    it('receiveMessage with no message throws error', () => {

        expect(() => { msgr.receiveMessage(null) })
            .toThrowError('Invalid message received');
    });

    it('receiveMessage with no origin throws error', () => {

        expect(() => { msgr.receiveMessage({}) })
            .toThrowError('The message has no origin');
    });

    it('receiveMessage with no data throws error', () => {

        expect(() => {
            msgr.receiveMessage({
                origin: '*'
            })
        }).toThrowError('The message has no data');
    });

    it('receiveMessage with no verb throws error', () => {

        expect(() => {
            msgr.receiveMessage({
                origin: '*',
                data: {}
            })
        }).toThrowError('The message has no verb');
    });

    it('receiveMessage with no id throws error', () => {

        expect(() => {
            msgr.receiveMessage({
                origin: '*',
                data: {
                    verb: verb
                }
            })
        }).toThrowError('The message has no id');
    });

    it('receiveMessage with REQUEST message does not invoke promise function', () => {

        spyOn(msgr, 'invokePromiseFunction');
        message.data.type = MessageType.Request;

        msgr.receiveMessage(message);

        expect(msgr.invokePromiseFunction).not.toHaveBeenCalled();
    });

    // it('receiveMessage rejects promise', () => {        
    // });

    it('receiveMessage resolves promise', (done) => {

        spyOn(msgr, 'createGuid').and.returnValue(id);
        message.data.type = MessageType.Response;

        const promise = msgr.sendMessage(verb, payload)
            .then((data) => {
                expect(data.payload.test).toEqual('abc');
                done();            
            });
        msgr.receiveMessage(message);        
    });

    // it('receiveMessage sends error message', () => {        
    // });

    // it('receiveMessage does not invoke received callback', () => {        
    // });

    // it('receiveMessage invokes received callback', () => {        
    // });



});