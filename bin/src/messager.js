var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
var Messager = /** @class */ (function () {
    function Messager(options) {
        var _this = this;
        this.payloadStructures = new Map();
        this.receivedCallbacks = new Map();
        this.promises = new Map();
        this.messageStructure = {
            verb: 'string',
            id: 'string',
            date: 'string',
            type: ['REQUEST', 'RESPONSE'],
            source: 'string',
            payload: {}
        };
        this.receiveMessage = function (message) {
            var error = _this.validateReceivedMessage(message);
            if (error) {
                throw new Error(error);
            }
            ;
            if (!_this.validReceivedOrigin(message) ||
                (_this.validateMessage(message.data, _this.messageStructure)).length > 0) {
                return;
            }
            var data = message.data;
            var key = _this.createMessageKey(data.verb, data.type);
            var payloadErrors = _this.validateMessage(data, _this.payloadStructures.get(key));
            if (data.type === MessageType.Response) {
                _this.invokePromiseFunction(data, payloadErrors.length > 0 ? payloadErrors : null);
            }
            if (payloadErrors.length > 0) {
                _this.sendMessage(message.verb, _this.createPayloadErrorMessage(message, payloadErrors));
                return;
            }
            _this.invokeReceivedCallback(key, data.payload);
        };
        this.sendMessage = function (verb, payload) {
            if (payload === void 0) { payload = null; }
            if (!verb) {
                _this.logAndThrowError('Invalid verb parameter in sendMessage');
            }
            var id = _this.createGuid();
            return new Promise(function (resolve, reject) {
                _this.promises.set(id, _this.createPromiseFunction(resolve, reject));
                _this.postMessage(_this.createMessage(verb, id, MessageType.Request, payload));
            });
        };
        this.validateMessage = function (data, structure) {
            var errors = [];
            if (!structure) {
                return errors;
            }
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
        this.createPayloadErrorMessage = function (message, errors) {
            return _this.createMessage(message.verb, _this.createGuid(), MessageType.Request, message.payload, {
                errorDescription: 'Invalid Payload Structure Received',
                errors: errors,
                originalMessage: message
            });
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
        this.invokeReceivedCallback = function (key, payload) {
            var callback = _this.receivedCallbacks.get(key);
            if (callback) {
                callback(payload);
            }
        };
        this.invokePromiseFunction = function (data, errors) {
            var fn = _this.promises.get(data.id);
            if (fn) {
                fn(data, errors);
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
            var err;
            if (!message) {
                err = 'Invalid message received';
            }
            else if (!message.origin) {
                err = 'Invalid message received. The message has no origin.';
            }
            else if (!message.data) {
                err = 'Invalid message received. The message has no data.';
            }
            if (err) {
                _this.logError(err);
                return err;
            }
            return '';
        };
        this.validReceivedOrigin = function (message) {
            if (message.origin !== _this.targetOrigin) {
                var text = "The message with origin: " + message.origin + " \n                          is not for this target origin: " + _this.targetOrigin;
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
        if (options.receivedCallbacks) {
            for (var _b = 0, _c = Object.keys(options.receivedCallbacks); _b < _c.length; _b++) {
                var key = _c[_b];
                this.receivedCallbacks.set(key, options.receivedCallbacks[key]);
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