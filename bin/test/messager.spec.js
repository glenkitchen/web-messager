describe('Messager', function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 1000;
    var msgr;
    var verb;
    var id;
    var date;
    var type;
    var source;
    var payload;
    var message;
    var structure;
    beforeEach(function () {
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
    });
    it('sendMessage called without a verb throws error', function () {
        expect(function () { msgr.sendMessage(null); })
            .toThrowError('Invalid verb parameter in sendMessage');
    });
    it('sendMessage creates a Guid', function () {
        spyOn(msgr, 'createGuid');
        msgr.sendMessage(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalled();
    });
    it('sendMessage creates a promise function', function () {
        spyOn(msgr, 'createPromiseFunction');
        msgr.sendMessage(verb, payload);
        expect(msgr.createPromiseFunction).toHaveBeenCalled();
    });
    it('sendMessage creates a message', function () {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');
        msgr.sendMessage(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id, MessageType.Request, payload, null);
    });
    it('sendMessage posts a message', function () {
        spyOn(msgr, 'createMessage').and.returnValue(message);
        spyOn(msgr, 'postMessage');
        msgr.sendMessage(verb, payload);
        expect(msgr.postMessage).toHaveBeenCalledWith(message);
    });
    it('sendMessage returns a Promise', function () {
        expect(msgr.sendMessage(verb, payload)).toEqual(jasmine.any(Promise));
    });
    it('validateMessage called without a structure should return no errors', function () {
        var errors = msgr.validateMessage(message, null);
        expect(errors.length).toEqual(0);
    });
    it('validateMessage with a missing property should return error', function () {
        var message = {
            payload: 'abc'
        };
        var structure = {
            mandatory: 'string'
        };
        var errors = msgr.validateMessage(message, structure);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Validate Message. Missing message property mandatory');
    });
    it('validateMessage with an invalid array value should return error', function () {
        var message = {
            type: 'REQUESt'
        };
        var structure = {
            type: ['REQUEST', 'RESPONSE']
        };
        var errors = msgr.validateMessage(message, structure);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Validate Message. Message property type with value REQUESt does not exist in array [REQUEST,RESPONSE]');
    });
    it('validateMessage with an invalid type should return error', function () {
        var message = {
            payload: 'abc'
        };
        var structure = {
            payload: 'number'
        };
        var errors = msgr.validateMessage(message, structure);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Validate Message. Message property payload is a string instead of a number');
    });
    it('validateMessage with invalid sub-object properties should return errors', function () {
        var message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def'
            }
        };
        var errors = msgr.validateMessage(message, structure);
        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Validate Message. Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Validate Message. Message property testNumber is a string instead of a number');
    });
    it('validateMessage with valid properties should return no errors', function () {
        var message = {
            test: 'abc',
            subObject: {
                testBoolean: true,
                testNumber: 123,
                testString: 'def'
            }
        };
        var errors = msgr.validateMessage(message, structure);
        expect(errors.length).toEqual(0);
    });
    it('receiveMessage with no message throws error', function () {
        expect(function () { msgr.receiveMessage(null); })
            .toThrowError('Invalid message received');
    });
    it('receiveMessage with no origin throws error', function () {
        expect(function () { msgr.receiveMessage({}); })
            .toThrowError('Invalid message received. The message has no origin.');
    });
    it('receiveMessage with no data throws error', function () {
        expect(function () {
            msgr.receiveMessage({
                origin: '*'
            });
        }).toThrowError('Invalid message received. The message has no data.');
    });
    it('receiveMessage with another origin does not process message', function () {
        spyOn(msgr, 'logVerbose');
        spyOn(msgr, 'createMessageKey');
        var msg = {
            origin: 'anotherorigin ',
            data: {}
        };
        msgr.receiveMessage(msg);
        expect(msgr.logVerbose).toHaveBeenCalled();
        expect(msgr.createMessageKey).not.toHaveBeenCalled();
    });
    it('receiveMessage creates a message key', function () {
        spyOn(msgr, 'createMessageKey');
        msgr.receiveMessage(message);
        //     expect(msgr.createMessageKey).toHaveBeenCalledWith(verb, MessageType.Response);
    });
    // it('receiveMessage with no verb logs error', () => {
    //     spyOn(msgr, 'logError');
    //     msgr.receiveMessage({
    //         origin: '*',
    //         data: {}
    //     })
    //     expect(msgr.logError).toHaveBeenCalledWith([
    //         'Validate Message. Missing message property verb',
    //         'Validate Message. Missing message property id',
    //         'Validate Message. Missing message property date',
    //         'Validate Message. Missing message property type',
    //         'Validate Message. Missing message property source',
    //         'Validate Message. Missing message property payload']);
    // });
    // it('receiveMessage with no id logs error', () => {
    //     spyOn(msgr, 'logError');
    //     msgr.receiveMessage({
    //         origin: '*',
    //         data: {
    //             verb: verb
    //         }
    //     })
    //     expect(msgr.logError).toHaveBeenCalledWith([
    //         'Validate Message. Missing message property id',
    //         'Validate Message. Missing message property date',
    //         'Validate Message. Missing message property type',
    //         'Validate Message. Missing message property source',
    //         'Validate Message. Missing message property payload']);
    // });
    // it('receiveMessage with REQUEST message does not invoke promise function', () => {
    //     spyOn(msgr, 'invokeResponsePromise');
    //     message.data.type = MessageType.Request;
    //     msgr.receiveMessage(message);
    //     expect(msgr.invokeResponsePromise).not.toHaveBeenCalled();
    // });
    // it('receiveMessage with errors rejects promise', (done) => {
    //     const error = ['Validate Message. Message property testBoolean is a string instead of a boolean'];
    //     spyOn(msgr, 'createGuid').and.returnValue(id);        
    //     spyOn(msgr, 'validateMessage').and.returnValue(error)
    //     msgr.sendMessage(verb, payload)
    //         .then(
    //         data => { }
    //         ,err => {
    //             expect(err).toEqual(err);
    //             done();
    //         });
    //     msgr.receiveMessage(message);
    // });
    // it('receiveMessage resolves promise', (done) => {
    //     spyOn(msgr, 'createGuid').and.returnValue(id);
    //     msgr.sendMessage(verb, payload)
    //         .then(data => {
    //             expect(data.payload.test).toEqual('abc');
    //             done();
    //         });
    //     msgr.receiveMessage(message);
    // });
    // it('receiveMessage with error sends error message', () => {        
    // });
    // it('receiveMessage without received callback does not invoke a callback', () => {        
    // });
    // it('receiveMessage invokes received callback', () => {        
    // });
});
//# sourceMappingURL=messager.spec.js.map