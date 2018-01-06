/**
 * TODO
 *  linter 80 characters per line
 *  receive
 *  callbacks
 *  log/trace
 *  validation
 *  error handling and reject
 *  destroy
 *  unit test
 *  interacive test
 *  documentation
 *  npm package
 */
/**
 * The type of message.
 */
var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
/**
 * Helper library for web messaging i.e. window.postMessage()
 *
 * Use JSON message structures for easy validation:
 *
 * Use promises for request-response roundtrips:
 *
 */
var Messager = /** @class */ (function () {
    /**
     *
     * @param options
     */
    function Messager(options) {
        // Map verbs to message payload structures
        this.messageStructures = new Map();
        // Map id's (guids) to message promises    
        this.promises = new Map();
        this.requestCallbacks = new Map();
        this.responseCallbacks = new Map();
        this.baseMessageStructure = {
            verb: 'string',
            id: 'string',
            date: 'string',
            type: ['REQUEST', 'RESPONSE'],
            source: 'string'
        };
        this.InvalidMessageString = 'Invalid message received';
        this.NoMessageOriginString = 'The message has no origin';
        this.targetWindow = options.targetWindow;
        this.targetOrigin = options.targetOrigin;
        this.source = options.source;
        window.addEventListener("message", this.receiveMessage);
    }
    /**
         * Receive a message.
         *
         * @param message. The received message.
         */
    Messager.prototype.receiveMessage = function (message) {
        if (!message) {
            this.doError(this.InvalidMessageString);
        }
        if (!this.isMessageAllowed(message)) {
            return;
        }
        // invoke the resolver function to resolve the payload
        var resolver = this.promises.get(message.id);
        var msg = resolver(message);
        // execute the received callback
        //const callback = this(message.verb);
        //callback(msg.payload);
    };
    /**
     * Creates and posts a request message with the specified verb and payload.
     * Returns a Promise which is resolved when the response message
     * is received.
     *
     * @example Send a fire-and-forgot message.
     * I.e Do not wait for a response message.
     *
     * @example Send a request message and perform an action when the response
     * message is received.
     *
     * @param verb. The message verb. TODO validate.
     * @param payload. The message payload. TODO validate.
     * @returns A Promise that is resolved when the response message is
     * received.
     */
    Messager.prototype.send = function (verb, payload) {
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
    Messager.prototype.validateMessage = function (message, messageStructure) {
        var errors = [];
        var _loop_1 = function (key) {
            var val1 = messageStructure[key];
            var val2 = message[key];
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
        for (var _i = 0, _a = Object.keys(messageStructure); _i < _a.length; _i++) {
            var key = _a[_i];
            _loop_1(key);
        }
        return errors;
    };
    // TODO? Use more robust uuid implementation
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
            source: this.source,
            payload: payload || {}
        };
        if (error) {
            message.error = error;
        }
        return message;
    };
    // TODO? Send Error Response  
    Messager.prototype.doError = function (errorMessage) {
        console.error('Messager', errorMessage);
        throw new Error(errorMessage);
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
    Messager.prototype.isMessageAllowed = function (message) {
        if (!message.origin) {
            this.doError(this.NoMessageOriginString);
        }
        return message.origin === this.targetOrigin;
    };
    Messager.prototype.postMessage = function (message) {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map