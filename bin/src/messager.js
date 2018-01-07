var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
var Messager = /** @class */ (function () {
    function Messager(options) {
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
        this.targetWindow = options.targetWindow;
        this.targetOrigin = options.targetOrigin;
        this.messageSource = options.messageSource;
        this.mustLogInfo = options.mustLogInfo || true;
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
    Messager.prototype.receiveMessage = function (message) {
        if (!this.validateReceivedMessage(message)) {
            return;
        }
        var data = message.data;
        var key = this.createMessageKey(message.verb, message.type);
        this.validateMessage(data, this.getMessageStructure(key));
        if (message.type === MessageType.Response) {
            this.invokeResolver(data.id, data.payload);
        }
        this.invokeReceivedCallback(key, data.payload);
    };
    Messager.prototype.sendMessage = function (verb, payload) {
        var _this = this;
        if (payload === void 0) { payload = null; }
        var id = this.createGuid();
        var message = this.createMessage(verb, id, MessageType.Request, payload);
        return new Promise(function (resolve) {
            // map the guid to a resolver function   
            _this.promises.set(id, function (payload) {
                resolve(payload);
                return payload;
            });
            _this.postMessage(message);
        });
    };
    Messager.prototype.validateMessage = function (data, structure) {
        var errors = [];
        var _loop_1 = function (key) {
            var val1 = structure[key];
            var val2 = data[key];
            var type1 = this_1.getType(val1);
            var type2 = this_1.getType(val2);
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
                errors = this_1.validateMessage(val2, val1).slice();
            }
            else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number')) {
                if (val1 !== type2) {
                    errors.push("Message property " + key + " is a " + type2 + " instead of a " + val1);
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = Object.keys(structure); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_1(key);
        }
        return errors;
    };
    Messager.prototype.createGuid = function () {
        var s4 = function () { return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1); };
        return s4() + s4() + "-" + s4() + "-" + s4() + "-"
            + s4() + "-" + s4() + s4() + s4();
    };
    Messager.prototype.createMessage = function (verb, id, type, payload, error) {
        if (error === void 0) { error = null; }
        var message = {
            verb: verb,
            id: id,
            date: new Date().toLocaleString(),
            type: type,
            source: this.messageSource,
            payload: payload || {}
        };
        if (error) {
            message.error = error;
        }
        return message;
    };
    Messager.prototype.createMessageKey = function (verb, type) {
        return {
            verb: verb,
            type: type
        };
    };
    Messager.prototype.doError = function (errorMessage) {
        console.error('Messager', errorMessage);
        throw new Error(errorMessage);
    };
    Messager.prototype.getMessageStructure = function (key) {
        var structure = this.messageStructures.get(key);
        if (!structure) {
            this.messageStructures.set(key, Object.assign({}, this.baseMessageStructure));
            structure = this.messageStructures.get(key);
        }
        return structure;
    };
    Messager.prototype.getType = function (val) {
        if (Array.isArray(val)) {
            return 'array';
        }
        else if (val === null) {
            return 'null';
        }
        return typeof val;
    };
    Messager.prototype.invokeReceivedCallback = function (key, payload) {
        var callback = this.receivedCallbacks.get(key);
        if (callback) {
            callback(payload);
        }
    };
    Messager.prototype.invokeResolver = function (id, payload) {
        var resolver = this.promises.get(id);
        if (resolver) {
            resolver(payload);
        }
        else {
            this.logInfo("No Promise for a RESPONSE message with id " + id);
        }
    };
    Messager.prototype.logInfo = function (message) {
        if (this.mustLogInfo) {
            console.info('Messager', message);
        }
    };
    Messager.prototype.postMessage = function (message) {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    };
    Messager.prototype.validateMessageProperty = function (obj, props) {
        var _this = this;
        props.forEach(function (prop) {
            if (!obj[prop]) {
                _this.doError("The message has no " + prop);
            }
        });
    };
    ;
    Messager.prototype.validateReceivedMessage = function (message) {
        if (!message) {
            this.doError('Invalid message received');
        }
        this.validateMessageProperty(message, ['origin', 'data']);
        this.validateMessageProperty(message.data, ['verb', 'id', 'date', 'type', 'source', 'payload']);
        return message.origin === this.targetOrigin;
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map