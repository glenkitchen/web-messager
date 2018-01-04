/**
 * TODO
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
 *
 */
var MessageType;
(function (MessageType) {
    MessageType["Request"] = "REQUEST";
    MessageType["Response"] = "RESPONSE";
})(MessageType || (MessageType = {}));
/**
 * Helper library for web messaging i.e. window.postMessage()
 *
 * JSON message structure:
 *
 * Request-response roundtrip:
 *
 */
var Messager = /** @class */ (function () {
    /**
     *
     * @param options
     */
    function Messager(options) {
        this.promises = new Map();
        this.requestCallbacks = new Map();
        this.responseCallbacks = new Map();
        this.window = options.window;
        this.origin = options.origin;
        this.targetOrigin = options.targetOrigin;
        window.addEventListener("message", this.receive);
    }
    /**
     * Creates and posts a request message with the specified verb and payload.
     * Returns a Promise with the companion response message.
     *
     * @example Send a fire-and-forgot message.
     * I.e Do not wait for a response message.
     *
     * @example Send a request message and perform an action when the response
     * message is received.
     *
     * @param verb. The message verb.
     * @param payload. The message payload.
     * @returns A Promise that is resolved when a companion response message is
     * received.
     */
    Messager.prototype.send = function (verb, payload) {
        var _this = this;
        if (payload === void 0) { payload = null; }
        var id = this.createGuid();
        var message = this.createMessage(verb, id, MessageType.Request, payload);
        return new Promise(function (resolve) {
            // map the guid to a  resolver function   
            _this.promises.set(id, function (payload) {
                resolve(payload);
                return payload;
            });
            _this.postMessage(message);
        });
    };
    /**
     *
     * @param message
     */
    Messager.prototype.receive = function (message) {
        if (!message) {
            this.logError('Invalid message parameter');
        }
        // invoke the resolver function to resolve the payload
        var resolver = this.promises.get(message.id);
        var msg = resolver(message);
        // execute the received callback
        //const callback = this(message.verb);
        //callback(msg.payload);
    };
    Messager.prototype.isMessageAllowed = function (message) { };
    Messager.prototype.isMessageValid = function (message) { };
    Messager.prototype.logError = function (errorMessage) {
        console.error('Messager', errorMessage);
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
            origin: this.origin,
            targetOrigin: this.targetOrigin,
            payload: payload || {}
        };
        if (error) {
            message.error = error;
        }
        return message;
    };
    Messager.prototype.postMessage = function (message) {
        this.window.postMessage(JSON.stringify(message), this.targetOrigin);
    };
    return Messager;
}());
//# sourceMappingURL=messager.js.map