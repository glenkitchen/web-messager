describe('Messager', function () {
    var msgr;
    var verb;
    var id;
    var date;
    var source;
    var payload;
    var message;
    beforeEach(function () {
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
                type: MessageType.Response,
                source: source,
                payload: payload
            }
        };
    });
    it('sendMessage without verb throws error', function () {
        expect(function () { msgr.sendMessage(null); })
            .toThrowError('Invalid verb parameter');
    });
    it('sendMessage creates a Guid', function () {
        spyOn(msgr, 'createGuid');
        msgr.sendMessage(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalled();
    });
    it('sendMessage creates a message', function () {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        spyOn(msgr, 'createMessage');
        msgr.sendMessage(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, id, MessageType.Request, payload);
    });
    it('sendMessage creates a promise function', function () {
        spyOn(msgr, 'createPromiseFunction');
        msgr.sendMessage(verb, payload);
        expect(msgr.createPromiseFunction).toHaveBeenCalled();
    });
    it('sendMessage posts a message', function () {
        var msg = {
            payload: 'abc'
        };
        spyOn(msgr, 'createMessage').and.returnValue(msg);
        spyOn(msgr, 'postMessage');
        msgr.sendMessage(verb, payload);
        expect(msgr.postMessage).toHaveBeenCalledWith(msg);
    });
    it('sendMessage returns a Promise', function () {
        expect(msgr.sendMessage(verb, payload)).toEqual(jasmine.any(Promise));
    });
    it('validateMessage with a missing property should return error', function () {
        var msg = {
            payload: 'abc'
        };
        var structure = {
            mandatory: 'string'
        };
        var errors = msgr.validateMessage(msg, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Missing message property mandatory');
    });
    it('validateMessage with an invalid type should return error', function () {
        var msg = {
            payload: 'abc'
        };
        var structure = {
            payload: 'number'
        };
        var errors = msgr.validateMessage(msg, structure);
        //console.log(errors);
        expect(errors.length).toEqual(1);
        expect(errors[0]).toContain('Message property payload is a string instead of a number');
    });
    it('validateMessage with an invalid array value should return error', function () {
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
    it('validateMessage with an invalid sub-object properties should return error', function () {
        var message = {
            test: 'abc',
            subObject: {
                testBoolean: 'true',
                testNumber: '123',
                testString: 'def'
            }
        };
        var structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string'
            }
        };
        var errors = msgr.validateMessage(message, structure);
        // console.log(errors);
        expect(errors.length).toEqual(2);
        expect(errors[0]).toContain('Message property testBoolean is a string instead of a boolean');
        expect(errors[1]).toContain('Message property testNumber is a string instead of a number');
    });
    it('validateMessage with a null structure type should NOT return error', function () {
        var message = {
            test: 'abc'
        };
        var structure = {
            test: null
        };
        var errors = msgr.validateMessage(message, structure);
        // console.log(errors);
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
    it('receiveMessage with no verb logs error', function () {
        spyOn(msgr, 'doError');
        msgr.receiveMessage({
            origin: '*',
            data: {}
        });
        expect(msgr.doError).toHaveBeenCalledWith([
            'Missing message property verb',
            'Missing message property id',
            'Missing message property date',
            'Missing message property type',
            'Missing message property source',
            'Missing message property payload'
        ], false);
    });
    it('receiveMessage with no id logs error', function () {
        spyOn(msgr, 'doError');
        msgr.receiveMessage({
            origin: '*',
            data: {
                verb: verb
            }
        });
        expect(msgr.doError).toHaveBeenCalledWith([
            'Missing message property id',
            'Missing message property date',
            'Missing message property type',
            'Missing message property source',
            'Missing message property payload'
        ], false);
    });
    it('receiveMessage with REQUEST message does not invoke promise function', function () {
        spyOn(msgr, 'invokePromiseFunction');
        message.data.type = MessageType.Request;
        msgr.receiveMessage(message);
        expect(msgr.invokePromiseFunction).not.toHaveBeenCalled();
    });
    it('receiveMessage rejects promise', function (done) {
        spyOn(msgr, 'createGuid').and.returnValue(id);
        delete message.data.verb;
        var promise = msgr.sendMessage(verb, payload)
            .then(function (data) {
            expect(data.payload.test).toEqual('abc');
            done();
        });
        msgr.receiveMessage(message);
    });
    // it('receiveMessage resolves promise', (done) => {
    //     spyOn(msgr, 'createGuid').and.returnValue(id);
    //     const promise = msgr.sendMessage(verb, payload)
    //         .then((data) => {
    //             expect(data.payload.test).toEqual('abc');
    //             done();            
    //         });
    //     msgr.receiveMessage(message);        
    // });
    // it('receiveMessage sends error message', () => {        
    // });
    // it('receiveMessage does not invoke received callback', () => {        
    // });
    // it('receiveMessage invokes received callback', () => {        
    // });
});
//# sourceMappingURL=messager.spec.js.map