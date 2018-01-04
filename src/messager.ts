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
 * window
 *  iframe.contentWindow
 *  window.parent 
 */
interface MessagerOptions {
    window: Window,
    origin: string,
    targetOrigin: string
}

/**
 * 
 */
enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

/**
 * Helper library for web messaging i.e. window.postMessage() 
 * 
 * JSON message structure:
 * 
 * Request-response roundtrip: 
 *  
 */
class Messager {

    private window: Window;
    private origin: string;
    private targetOrigin: string;
    private promises = new Map();
    private requestCallbacks = new Map();
    private responseCallbacks = new Map();

    /**
     * 
     * @param options 
     */
    constructor(options: MessagerOptions) {

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
    send(verb: string, payload: object = null) {

        const id = this.createGuid();
        const message = this.createMessage(verb, id, MessageType.Request, payload);

        return new Promise((resolve) => {
            // map the guid to a  resolver function   
            this.promises.set(id, payload => {
                resolve(payload)
                return payload;
            });
            this.postMessage(message);
        });
    }

    /**
     * 
     * @param message 
     */
    receive(message) {
        if (!message) {
            this.logError('Invalid message parameter');
        }

        // invoke the resolver function to resolve the payload
        const resolver = this.promises.get(message.id);
        const msg = resolver(message);

        // execute the received callback
        //const callback = this(message.verb);
        //callback(msg.payload);
    }

    private isMessageAllowed(message) { }

    private isMessageValid(message) { }

    private logError(errorMessage) {
        console.error('Messager', errorMessage);
    }

    private createGuid(): string {

        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-"
            + s4() + "-" + s4() + s4() + s4();
    }

    private createMessage(verb: string, id: string, type: MessageType,
        payload: object, error: object = null): object {

        const message: any = {
            verb: verb,
            id: id,
            date: new Date().toLocaleString(),
            type: type,
            origin: this.origin,
            targetOrigin: this.targetOrigin,
            payload: payload || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
    }

    private postMessage(message) {
        this.window.postMessage(JSON.stringify(message), this.targetOrigin);
    }

}