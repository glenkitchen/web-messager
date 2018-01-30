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
        var data = JSON.stringify({
            verb: verb,
            id: id,
            date: date,
            type: type,
            source: source,
            payload: payload
        });
        message = {
            origin: '*',
            data: data
        };
        structure = {
            test: 'string',
            subObject: {
                testBoolean: 'boolean',
                testNumber: 'number',
                testString: 'string'
            }
        };
        spyOn(msgr, 'createGuid').and.returnValue(id);
    });
    it('sendMessage called without a verb throws error', function () {
        expect(function () { msgr.sendMessage(null); })
            .toThrowError('Invalid verb parameter in sendMessage');
    });
    it('sendMessage creates a promise function', function () {
        spyOn(msgr, 'createPromiseFunction');
        msgr.sendMessage(verb, payload);
        expect(msgr.createPromiseFunction).toHaveBeenCalled();
    });
    it('sendMessage creates a message', function () {
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
    it('receiveMessage with no MessageEvent throws error', function () {
        expect(function () { msgr.receiveMessage(null); })
            .toThrowError('Invalid MessageEvent. The MessageEvent is falsy.');
    });
    it('receiveMessage with no MessageEvent origin throws error', function () {
        expect(function () { msgr.receiveMessage({}); })
            .toThrowError('Invalid MessageEvent. The MessageEvent has no origin.');
    });
    it('receiveMessage with no MessageEvent data throws error', function () {
        expect(function () {
            msgr.receiveMessage({ origin: '*' });
        }).toThrowError('Invalid MessageEvent. The MessageEvent has no data.');
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
    it('receiveMessage with invalid JSON data throws error', function () {
        spyOn(msgr, 'logError');
        expect(function () { return msgr.receiveMessage({
            origin: '*',
            data: {}
        }); }).toThrowError('SyntaxError: Unexpected token o in JSON at position 1');
    });
    it('receiveMessage with no id logs error', function () {
        spyOn(msgr, 'logError');
        var data = JSON.stringify({ verb: verb });
        msgr.receiveMessage({
            origin: '*',
            data: data
        });
        expect(msgr.logError).toHaveBeenCalledWith([
            'Validate Message. Missing message property id',
            'Validate Message. Missing message property date',
            'Validate Message. Missing message property type',
            'Validate Message. Missing message property source',
            'Validate Message. Missing message property payload'
        ]);
    });
    it('receiveMessage creates a message key', function () {
        spyOn(msgr, 'createMessageKey');
        msgr.receiveMessage(message);
        expect(msgr.createMessageKey).toHaveBeenCalledWith(verb, MessageType.Response);
    });
    it('receiveMessage with REQUEST type invokes request callback method', function () {
        spyOn(msgr, 'invokeRequestCallback');
        var data = JSON.stringify({
            verb: verb,
            id: id,
            date: date,
            type: MessageType.Request,
            source: source,
            payload: payload
        });
        var message = {
            origin: '*',
            data: data
        };
        msgr.receiveMessage(message);
        expect(msgr.invokeRequestCallback).toHaveBeenCalled();
    });
    it('receiveMessage with RESPONSE type invokes response promise', function () {
        spyOn(msgr, 'invokeResponsePromise');
        msgr.receiveMessage(message);
        expect(msgr.invokeResponsePromise).toHaveBeenCalledWith(message, null);
    });
});
//# sourceMappingURL=messager.spec.js.map