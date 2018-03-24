var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
;
var Messager = /** @class */ (function () {
    function Messager(options) {
        var _this = this;
        this.options = options;
        this.responsePromises = {};
        var error = this.validateMessagerOptions(options);
        if (error) {
            throw error;
        }
        options.targetWindow = options.targetWindow || window.parent;
        options.targetOrigin = options.targetOrigin || '*';
        options.messageOrigin = options.messageOrigin || 'default-origin';
        options.bodyStructures = options.bodyStructures || {};
        options.receivedCallbacks = options.receivedCallbacks || {};
        window.addEventListener('message', function (event) { return _this.receiveMessage; });
    }
    /**
     * Main Public Api
     */
    Messager.prototype.createMessage = function (verb, id, body, type, error) {
        var message = {
            id: id || this.createGuid(),
            verb: verb,
            type: type || MessageType.Request,
            origin: this.options.messageOrigin,
            body: body || {}
        };
        if (error) {
            message.error = error;
        }
        return message;
    };
    Messager.prototype.createErrorMessage = function (verb, error) {
        var message = this.createMessage(verb);
        message.error = error;
        return message;
    };
    Messager.prototype.createRequestMessage = function (verb, body) {
        return this.createMessage(verb, undefined, body, MessageType.Request);
    };
    Messager.prototype.createResponseMessage = function (verb, id, body) {
        return this.createMessage(verb, id, body, MessageType.Response);
    };
    Messager.prototype.receiveMessage = function (messageEvent) {
        var messageEventError = this.validateMessageEvent(messageEvent);
        if (messageEventError) {
            throw messageEventError;
        }
        var data = JSON.parse(messageEvent.data);
        var messageStructure = {
            id: 'string',
            verb: 'string',
            type: ['REQUEST', 'RESPONSE'],
            origin: 'string',
            body: {}
        };
        var messageStructureErrors = this.validateStructure(data, messageStructure);
        if (messageStructureErrors.length > 0) {
            throw messageStructureErrors.join();
        }
        var key = this.buildKey(data.verb, data.type);
        var messageBodyErrors = this.validateStructure(data.body, this.options.bodyStructures[key]);
        if (messageBodyErrors.length > 0) {
            this.sendErrorMessage('Invalid Message Body Received', messageBodyErrors.join(), data);
        }
        //TODO order?
        if (data.type = MessageType.Response) {
            this.invokeResponsePromiseFunction(data, messageBodyErrors.length > 0 ? messageBodyErrors.join() : undefined);
        }
        if (messageBodyErrors.length === 0) {
            this.invokeReceivedCallback(data);
        }
        ;
    };
    Messager.prototype.sendMessage = function (message) {
        //return new Promise((resolve, reject) => {
        //    this.responsePromises[message.id] = this.createPromiseFunction(resolve, reject);
        this.postMessage(message);
        //});
    };
    Messager.prototype.validateStructure = function (data, structure) {
        if (this.getType(structure) !== 'object') {
            return [];
        }
        var errors = [];
        for (var _i = 0, _a = Object.keys(structure); _i < _a.length; _i++) {
            var key = _a[_i];
            var val1 = structure[key];
            var val2 = data ? data[key] : undefined;
            var type1 = this.getType(val1);
            var type2 = val2 ? this.getType(val2) : undefined;
            if (!val2 && ((type1 === 'string' && !val1.endsWith('?')) || type1 !== 'string')) {
                errors.push("Missing property " + key);
            }
            else if (type1 === 'array' && !val1.contains(val2)) {
                errors.push("Property " + key + " with value " + val2 + " does not exist in array [" + val1 + "]");
            }
            else if (type1 === 'object') {
                errors = errors.concat(this.validateStructure(val2, val1));
            }
            else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number') && val1 !== type2) {
                errors.push("Property " + key + " is a " + type2 + " instead of a " + val1);
            }
        }
        return errors;
    };
    /*
    ** Public Methods
    */
    Messager.prototype.getOptions = function () {
        return this.options;
    };
    Messager.prototype.addBodyStructure = function (type, verb, structure) {
        var key = this.buildKey(type, verb);
        this.options.bodyStructures[key] = structure;
    };
    Messager.prototype.addReceivedCallBack = function (type, verb, callback) {
        var key = this.buildKey(type, verb);
        this.options.receivedCallbacks[key] = callback;
    };
    /**
      * Private methods
    */
    Messager.prototype.createMessageError = function (description, detail, originalMessage) {
        return {
            description: description,
            detail: detail,
            originalMessage: originalMessage
        };
    };
    Messager.prototype.buildKey = function (type, verb) {
        return type + "." + verb;
    };
    Messager.prototype.createPromiseFunction = function (resolve, reject) {
        return function (data, error) {
            if (error) {
                reject(error);
            }
            resolve(data);
        };
    };
    Messager.prototype.invoker = function (invokee, message) {
        return function () {
            try {
                invokee();
            }
            catch (err) {
                this.sendErrorMessage('Error Invoking Function', err, message);
                throw err;
            }
        };
    };
    Messager.prototype.invokeReceivedCallback = function (message) {
        var key = this.buildKey(message.type, message.verb);
        var callback = this.options.receivedCallbacks[key];
        if (callback) {
            this.invoker(callback(message.body), message)();
        }
    };
    Messager.prototype.invokeResponsePromiseFunction = function (message, error) {
        var f = this.responsePromises[message.id];
        if (f) {
            this.invoker(f(message.body, error), message)();
        }
    };
    Messager.prototype.postMessage = function (message) {
        //this.options.targetWindow.postMessage(JSON.stringify(message), this.options.targetOrigin);
        window.parent.postMessage(JSON.stringify(message), this.options.targetOrigin);
    };
    Messager.prototype.sendErrorMessage = function (description, detail, originalMessage) {
        this.sendMessage(this.createErrorMessage(originalMessage.verb, this.createMessageError(description, detail, originalMessage)));
    };
    Messager.prototype.validateMessageEvent = function (messageEvent) {
        if (!messageEvent) {
            return 'MessageEvent must have a value.';
        }
        else if (!messageEvent.origin) {
            return 'MessageEvent must have an origin.';
        }
        else if (!messageEvent.data) {
            return 'MessageEvent must have data.';
        }
        else if (messageEvent.origin !== this.options.targetOrigin) {
            return "This message: " + messageEvent + " is not for this target origin: " + this.options.targetOrigin;
        }
        return '';
    };
    Messager.prototype.validateMessagerOptions = function (options) {
        if (!options) {
            return 'MesssageOptions must have a value.';
        }
    };
    /**
     * Private Utlity methods
     */
    Messager.prototype.createGuid = function () {
        var s4 = function () { return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1); };
        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    };
    Messager.prototype.getType = function (value) {
        if (Array.isArray(value)) {
            return 'array';
        }
        else if (value === null) {
            return 'null';
        }
        return typeof value;
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map