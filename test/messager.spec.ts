describe('Messager', () => {

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1;

    let msgr;
    let verb;
    let id;
    let date;
    let type;
    let source;
    let payload;
    let message;
    let structure;

    beforeEach(() => {

        msgr = new Messager({
            targetWindow: window.parent,
            targetOrigin: '*',
            messageSource: source,
            mustLogError: false,
            mustLogVerbose: false
        });

        verb = 'TESTVERB';
        id = '123';
        date = new Date(2018, 1, 1);
        type = MessageType.Response;
        source = 'TestSource';
        payload = { test: 'abc' };

        message = {
            origin: '*',
            data: {
                verb: verb,
                id: id,
                date: date,
                type: type,
                source: source,
                payload: payload
            }
        };

        structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string'
            }
        };

    })

    it('sendMessage called without a verb throws error', () => {
        expect(() => { msgr.sendMessage(null) })
            .toThrowError('Invalid verb parameter in sendMessage');
    });

    it('sendMessage creates a Guid', () => {
        spyOn(msgr, 'createGuid');

        msgr.sendMessage(verb, payload);

        expect(msgr.createGuid).toHaveBeenCalled();
    });

    it('sendMessage creates a promise function', () => {
        spyOn(msgr, 'createPromiseFunction');

        msgr.sendMessage(verb, payload);

        expect(msgr.createPromiseFunction).toHaveBeenCalled();
    });

    it('sendMessage creates a message', () => {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');

        msgr.sendMessage(verb, payload);

        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id, MessageType.Request, payload);
    });

    it('sendMessage posts a message', () => {
        spyOn(msgr, 'createMessage').and.returnValue(message);
        spyOn(msgr, 'postMessage');

        msgr.sendMessage(verb, payload);

        expect(msgr.postMessage).toHaveBeenCalledWith(message);
    });

    it('sendMessage returns a Promise', () => {
        expect(msgr.sendMessage(verb, payload)).toEqual(jasmine.any(Promise));
    });

    it('validateMessage called without a structure should return no errors', () => {
        const errors = msgr.validateMessage(message, null);

        expect(errors.length).toEqual(0);
    });

    it('validateMessage with a missing property should return error', () => {
        const msg = {
            payload: 'abc'
        };
        const structure = {
            mandatory: 'string'
        };

        const errors = msgr.validateMessage(msg, structure);

        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Validate Message. Missing message property mandatory');
    });

    it('validateMessage with an invalid array value should return error', () => {
        const message = {
            type: 'REQUESt'
        };
        const structure = {
            type: ['REQUEST', 'RESPONSE']
        };

        const errors = msgr.validateMessage(message, structure);

        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain( 
            'Validate Message. Message property type with value REQUESt does not exist in array [REQUEST,RESPONSE]');

    });

    it('validateMessage with an invalid type should return error', () => {
        const msg = {
            payload: 'abc'
        };
        const structure = {
            payload: 'number'
        };

        const errors = msgr.validateMessage(msg, structure);

        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Validate Message. Message property payload is a string instead of a number');
    });

    it('validateMessage with invalid sub-object properties should return errors', () => {
        const message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def'
            }
        };
       
        const errors = msgr.validateMessage(message, structure);

        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Validate Message. Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Validate Message. Message property testNumber is a string instead of a number');
    });

    it('validateMessage with valid properties should return no errors', () => {
        const message = {
            test: 'abc',
            subObject: {
                testBoolean: true,
                testNumber: 123,
                testString: 'def'
            }
        };

        const errors = msgr.validateMessage(message, structure);

        expect(errors.length).toEqual(0);
    });

    it('receiveMessage with no message throws error', () => {

        expect(() => { msgr.receiveMessage(null) })
            .toThrowError('Invalid message received');
    });

    it('receiveMessage with no origin throws error', () => {

        expect(() => { msgr.receiveMessage({}) })
            .toThrowError('Invalid message received. The message has no origin.');
    });

    it('receiveMessage with no data throws error', () => {

        expect(() => {
            msgr.receiveMessage({
                origin: '*'
            })
        }).toThrowError('Invalid message received. The message has no data.');
    });

    it('receiveMessage with no verb logs error', () => {

        spyOn(msgr, 'logError');

        msgr.receiveMessage({
            origin: '*',
            data: {}
        })

        expect(msgr.logError).toHaveBeenCalledWith([
            'Missing message property verb',
            'Missing message property id',
            'Missing message property date',
            'Missing message property type',
            'Missing message property source',
            'Missing message property payload']);
    });

    it('receiveMessage with no id logs error', () => {

        spyOn(msgr, 'logError');

        msgr.receiveMessage({
            origin: '*',
            data: {
                verb: verb
            }
        })

        expect(msgr.logError).toHaveBeenCalledWith([
            'Missing message property id',
            'Missing message property date',
            'Missing message property type',
            'Missing message property source',
            'Missing message property payload']);
    });

    it('receiveMessage creates a message key', () => {

        spyOn(msgr, 'createMessageKey');

        msgr.receiveMessage(message);

        expect(msgr.createMessageKey).toHaveBeenCalledWith(verb, MessageType.Response);
    });

    it('receiveMessage with REQUEST message does not invoke promise function', () => {

        spyOn(msgr, 'invokePromiseFunction');
        message.data.type = MessageType.Request;

        msgr.receiveMessage(message);

        expect(msgr.invokePromiseFunction).not.toHaveBeenCalled();
    });

    // it('receiveMessage with errors rejects promise', () => {

    //     msgr = new Messager({
    //         targetWindow: window.parent,
    //         targetOrigin: '*',
    //         messageSource: source, 
    //         payloadStructures: {
    //             verb: () => {

    //             } 
    //         }
    //     });


    //     const msg = {
    //         payload: 'abc'
    //     };
    //     const structure = {
    //         payload: 'number'
    //     };

    //     spyOn(msgr, 'createGuid').and.returnValue(id);        
    //     spyOn(msgr, 'validateMessage').and
    
    //     const promise = msgr.sendMessage(verb, payload)
    //         .then(
    //         (data) => { }
    //         ,
    //         (err) => {
    //             console.log('receiveMessage with errors rejects promise');
    //             expect(err).toEqual('abcd');
    //         }
    //         );
    //     msgr.receiveMessage(message);
    //});

    it('receiveMessage resolves promise', (done) => {

        spyOn(msgr, 'createGuid').and.returnValue(id);

        const promise = msgr.sendMessage(verb, payload)
            .then((data) => {
                expect(data.payload.test).toEqual('abc');
                done();
            });
        msgr.receiveMessage(message);
    });

    // it('receiveMessage with error sends error message', () => {        
    // });

    // it('receiveMessage without received callback does not invoke a callback', () => {        
    // });

    // it('receiveMessage invokes received callback', () => {        
    // });

});