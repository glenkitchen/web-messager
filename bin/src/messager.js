var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
var Messager = /** @class */ (function () {
    function Messager(options) {
        var _this = this;
        this.payloadStructures = new Map();
        this.requestCallbacks = new Map();
        this.responsePromises = new Map();
        this.messageStructure = {
            verb: 'string',
            id: 'string',
            date: 'string',
            type: ['REQUEST', 'RESPONSE'],
            source: 'string',
            payload: {}
        };
        this.receiveMessage = function (message) {
            _this.validateReceivedMessage(message);
            if (!_this.validReceivedOrigin(message) ||
                (_this.validateMessage(message.data, _this.messageStructure)).length > 0) {
                return;
            }
            var data = message.data;
            var key = _this.createMessageKey(data.verb, data.type);
            var payloadErrors = _this.validateMessage(data.payload, _this.payloadStructures.get(key));
            if (payloadErrors) {
                _this.sendMessage(message.verb, _this.createErrorPayload('Invalid Payload Received', message.payload, payloadErrors));
            }
            if (data.type === MessageType.Request && !payloadErrors) {
                _this.invokeRequestCallback(message);
            }
            else if (data.type = MessageType.Response) {
                _this.invokeResponsePromise(message, payloadErrors.length > 0 ? payloadErrors : null);
            }
        };
        this.sendMessage = function (verb, payload, errors) {
            if (payload === void 0) { payload = null; }
            if (errors === void 0) { errors = null; }
            if (!verb) {
                _this.logAndThrowError('Invalid verb parameter in sendMessage');
            }
            var id = _this.createGuid();
            return new Promise(function (resolve, reject) {
                _this.responsePromises.set(id, _this.createPromiseFunction(resolve, reject));
                _this.postMessage(_this.createMessage(verb, id, MessageType.Request, payload, errors));
            });
        };
        this.validateMessage = function (data, structure) {
            if (!structure) {
                return [];
            }
            var errors = [];
            var _loop_1 = function (key) {
                var val1 = structure[key];
                var val2 = data ? data[key] : null;
                var type1 = _this.getType(val1);
                var type2 = val2 ? _this.getType(val2) : null;
                if (!val2) {
                    if ((type1 === 'string' && !val1.endsWith('?')) || type1 !== 'string') {
                        errors.push("Validate Message. Missing message property " + key);
                    }
                }
                else if (type1 === 'array') {
                    if (val1.findIndex(function (x) { return x === val2; }) < 0) {
                        errors.push("Validate Message. " +
                            ("Message property " + key + " with value " + val2 + " does not exist in array [" + val1 + "]"));
                    }
                }
                else if (type1 === 'object') {
                    errors = errors.concat(_this.validateMessage(val2, val1));
                }
                else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number')) {
                    if (val1 !== type2) {
                        errors.push("Validate Message. Message property " + key + " is a " + type2 + " instead of a " + val1);
                    }
                }
            };
            for (var _i = 0, _a = Object.keys(structure); _i < _a.length; _i++) {
                var key = _a[_i];
                _loop_1(key);
            }
            if (errors.length > 0) {
                _this.logError(errors);
            }
            return errors;
        };
        this.createGuid = function () {
            var s4 = function () { return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1); };
            return s4() + s4() + "-" + s4() + "-" + s4() + "-"
                + s4() + "-" + s4() + s4() + s4();
        };
        this.createErrorPayload = function (description, errors, originalMessage) {
            return {
                errorDescription: description,
                errors: errors,
                originalMessage: originalMessage
            };
        };
        this.createMessage = function (verb, id, type, payload, error) {
            if (id === void 0) { id = null; }
            if (type === void 0) { type = null; }
            if (payload === void 0) { payload = null; }
            if (error === void 0) { error = null; }
            var message = {
                verb: verb,
                id: id || _this.createGuid(),
                date: new Date().toLocaleString(),
                type: type || MessageType.Request,
                source: _this.messageSource,
                payload: payload || {}
            };
            if (error) {
                message.error = error;
            }
            return message;
        };
        this.createMessageKey = function (verb, type) {
            return {
                verb: verb,
                type: type
            };
        };
        this.getType = function (val) {
            if (Array.isArray(val)) {
                return 'array';
            }
            else if (val === null) {
                return 'null';
            }
            return typeof val;
        };
        this.invokeRequestCallback = function (message) {
            var callback = _this.requestCallbacks.get(message.verb);
            if (callback) {
                try {
                    callback(message.data.payload);
                }
                catch (error) {
                    _this.logError(error);
                    _this.sendMessage(message.verb, _this.createErrorPayload('Error Invoking Request Callback', error, message));
                }
            }
        };
        this.invokeResponsePromise = function (message, errors) {
            var data = message.data;
            var fn = _this.responsePromises.get(data.id);
            if (fn) {
                try {
                    fn(data.payload, errors);
                }
                catch (error) {
                    _this.logError(error);
                    _this.sendMessage(message.verb, _this.createErrorPayload('Error Invoking Response Promise', error, message));
                }
            }
            else {
                _this.logVerbose("No Promise for a RESPONSE message with id " + data.id, data);
            }
        };
        this.logError = function (message) {
            if (_this.mustLogError) {
                console.error('Messager', message);
            }
        };
        this.logAndThrowError = function (message) {
            _this.logError(message);
            throw new Error(message);
        };
        this.logVerbose = function (message, detail) {
            if (detail === void 0) { detail = null; }
            if (_this.mustLogVerbose) {
                console.info('Messager', message, detail);
            }
        };
        this.postMessage = function (message) {
            _this.targetWindow.postMessage(JSON.stringify(message), _this.targetOrigin);
        };
        this.validateReceivedMessage = function (message) {
            if (!message) {
                _this.logAndThrowError('Invalid message received');
            }
            else if (!message.origin) {
                _this.logAndThrowError('Invalid message received. The message has no origin.');
            }
            else if (!message.data) {
                _this.logAndThrowError('Invalid message received. The message has no data.');
            }
        };
        this.validReceivedOrigin = function (message) {
            if (message.origin !== _this.targetOrigin) {
                var text = "The message with origin: " + message.origin +
                    ("is not for this target origin: " + _this.targetOrigin);
                _this.logVerbose(text, message);
                return false;
            }
            return true;
        };
        this.targetWindow = options.targetWindow;
        this.targetOrigin = options.targetOrigin;
        this.messageSource = options.messageSource;
        this.mustLogError = options.mustLogError === false ? false : true;
        this.mustLogVerbose = options.mustLogVerbose === false ? false : true;
        if (options.payloadStructures) {
            for (var _i = 0, _a = Object.keys(options.payloadStructures); _i < _a.length; _i++) {
                var key = _a[_i];
                this.payloadStructures.set(key, options.payloadStructures[key]);
            }
        }
        if (options.requestCallbacks) {
            for (var _b = 0, _c = Object.keys(options.requestCallbacks); _b < _c.length; _b++) {
                var key = _c[_b];
                this.requestCallbacks.set(key, options.requestCallbacks[key]);
            }
        }
        window.addEventListener('message', this.receiveMessage);
    }
    Messager.prototype.createPromiseFunction = function (resolve, reject) {
        return function (data, error) {
            if (error) {
                reject(error);
            }
            resolve(data);
        };
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map