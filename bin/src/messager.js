var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
var Messager = /** @class */ (function () {
    function Messager(options) {
        var _this = this;
        this.messageStructures = new Map();
        this.receivedCallbacks = new Map();
        this.promises = new Map();
        this.baseMessageStructure = {
            verb: 'string',
            id: 'string',
            date: 'string',
            type: ['REQUEST', 'RESPONSE'],
            source: 'string',
            payload: {}
        };
        this.receiveMessage = function (message) {
            if (!_this.validateReceivedMessage(message)) {
                return;
            }
            var data = message.data;
            var key = _this.createMessageKey(data.verb, data.type);
            var errors = _this.validateMessage(data, _this.getMessageStructure(key));
            if (data.type === MessageType.Response) {
                _this.invokePromiseFunction(data.id, data.payload, errors);
            }
            _this.invokeReceivedCallback(key, data.payload);
        };
        this.sendMessage = function (verb, payload) {
            if (payload === void 0) { payload = null; }
            if (!verb) {
                _this.doError('Invalid verb parameter');
            }
            var id = _this.createGuid();
            var message = _this.createMessage(verb, id, MessageType.Request, payload);
            return new Promise(function (resolve, reject) {
                _this.promises.set(id, _this.createPromiseFunction(resolve, reject));
                _this.postMessage(message);
            });
        };
        this.validateMessage = function (data, structure) {
            var errors = [];
            var _loop_1 = function (key) {
                var val1 = structure[key];
                var val2 = data[key];
                var type1 = _this.getType(val1);
                var type2 = _this.getType(val2);
                if (!val2) {
                    if (!val1.endsWith('?')) {
                        errors.push("Missing message property " + key);
                    }
                }
                else if (type1 === 'array') {
                    if (val1.findIndex(function (x) { return x === val2; }) < 0) {
                        errors.push("Message property " + key + " with a value of " + val2 + " is not a valid value for " + val1);
                    }
                }
                else if (type1 === 'object') {
                    errors = _this.validateMessage(val2, val1).slice();
                }
                else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number')) {
                    if (val1 !== type2) {
                        errors.push("Message property " + key + " is a " + type2 + " instead of a " + val1);
                    }
                }
            };
            for (var _i = 0, _a = Object.keys(structure); _i < _a.length; _i++) {
                var key = _a[_i];
                _loop_1(key);
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
            if (error === void 0) { error = null; }
            var message = {
                verb: verb,
                id: id,
                date: new Date().toLocaleString(),
                type: type,
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
        this.doError = function (message) {
            if (_this.mustLogError) {
                console.error('Messager', message);
            }
            throw new Error(message);
        };
        this.getMessageStructure = function (key) {
            var structure = _this.messageStructures.get(key);
            if (!structure) {
                structure = Object.assign({}, _this.baseMessageStructure);
                _this.messageStructures.set(key, structure);
            }
            return structure;
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
        this.invokePromiseFunction = function (id, payload, errors) {
            var fn = _this.promises.get(id);
            if (fn) {
                fn(payload, errors);
            }
            else {
                _this.logInfo("No Promise for a RESPONSE message with id " + id);
            }
        };
        this.logInfo = function (message) {
            if (_this.mustLogInfo) {
                console.info('Messager', message);
            }
        };
        this.postMessage = function (message) {
            _this.targetWindow.postMessage(JSON.stringify(message), _this.targetOrigin);
        };
        this.validateMessageProperty = function (obj, props) {
            props.forEach(function (prop) {
                if (!obj[prop]) {
                    _this.doError("The message has no " + prop);
                }
            });
        };
        this.validateReceivedMessage = function (message) {
            if (!message) {
                _this.doError('Invalid message received');
            }
            if (message.origin && message.origin !== _this.targetOrigin) {
                return false;
            }
            _this.validateMessageProperty(message, ['origin', 'data']);
            _this.validateMessageProperty(message.data, ['verb', 'id', 'date', 'type', 'source', 'payload']);
            return true;
        };
        this.targetWindow = options.targetWindow;
        this.targetOrigin = options.targetOrigin;
        this.messageSource = options.messageSource;
        this.mustLogInfo = options.mustLogInfo || true;
        this.mustLogError = options.mustLogError || false;
        if (options.messageStructures) {
            for (var _i = 0, _a = Object.keys(options.messageStructures); _i < _a.length; _i++) {
                var key = _a[_i];
                this.messageStructures.set(key, Object.assign({}, this.baseMessageStructure, options.messageStructures[key]));
            }
        }
        if (options.receivedCallbacks) {
            for (var _b = 0, _c = Object.keys(options.receivedCallbacks); _b < _c.length; _b++) {
                var key = _c[_b];
                this.receivedCallbacks.set(key, options.receivedCallbacks[key]);
            }
        }
        window.addEventListener("message", this.receiveMessage);
    }
    Messager.prototype.createPromiseFunction = function (resolve, reject) {
        return function (payload, errors) {
            if (errors.length > 0) {
                reject(errors);
            }
            resolve(payload);
            return payload;
        };
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map