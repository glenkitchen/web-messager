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
 * Configuration options for a Messager instance.
 * 
 * window:
 * The reference to the target window.
 * The iframe host reference is iframe.contentWindow
 * For the iframe itself the referece is window.parent
 * 
 * targetOrigin:
 * The URI of the target origin.
 * 
 * source:
 * The source of the messages.    
 */
interface MessagerOptions {
    targetWindow: Window,
    targetOrigin: string,
    source: string
}

/**
 * The type of message.  
 */
enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

/**
 * Helper library for web messaging i.e. window.postMessage() 
 * 
 * Use JSON message structures for easy validation:
 * 
 * Use promises for request-response roundtrips: 
 *  
 */
class Messager {

    private targetWindow: Window;
    private targetOrigin: string;
    private source: string;
    // Map verbs to message payload structures
    private messageStructures = new Map();
    // Map id's (guids) to message promises    
    private promises = new Map();
    private requestCallbacks = new Map();
    private responseCallbacks = new Map();

    private baseMessageStructure = {
        verb: 'string',
        id: 'string',
        date: 'string',
        type: ['REQUEST', 'RESPONSE'],
        source: 'string'
    };

    private InvalidMessageString = 'Invalid message received';
    private NoMessageOriginString = 'The message has no origin';

    /**
     * 
     * @param options 
     */
    constructor(options: MessagerOptions) {

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
    receiveMessage(message) {
        if (!message) {
            this.doError(this.InvalidMessageString);
        }

        if (!this.isMessageAllowed(message)) {
            return;
        }

        // invoke the resolver function to resolve the payload
        const resolver = this.promises.get(message.id);
        const msg = resolver(message);

        // execute the received callback
        //const callback = this(message.verb);
        //callback(msg.payload);
    }

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
    send(verb: string, payload: object = null) {

        const id = this.createGuid();
        const message = this.createMessage(verb, id, MessageType.Request, payload);

        return new Promise((resolve) => {
            // map the guid to a resolver function   
            this.promises.set(id, payload => {
                resolve(payload)
                return payload;
            });
            this.postMessage(message);
        });
    }


    validateMessage(message, messageStructure): string[] {
        let errors = [];

        for (const key of Object.keys(messageStructure)) {
            const val1 = messageStructure[key];
            const val2 = message[key];
            const type1 = this.getType(val1);
            const type2 = this.getType(val2);

            if (!val2) {
                if (!val1.endsWith('?')) {
                    errors.push(`Missing message property ${key}`);
                }
            }
            else if (type1 === 'array') {
                if (val1.findIndex(x => x === val2) < 0) {
                    errors.push(`Message property ${key} with a value of ${val2} is not a valid value for ${val1}`);
                }
            }
            else if (type1 === 'object') {
                errors = [...this.validateMessage(val2, val1)];
            }
            else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number')) {
                if (val1 !== type2) {
                    errors.push(`Message property ${key} is a ${type2} instead of a ${val1}`);
                }
            }
        }

        return errors;
    }

    // TODO? Use more robust uuid implementation
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
            source: this.source,
            payload: payload || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
    }

    // TODO? Send Error Response  
    private doError(errorMessage) {
        console.error('Messager', errorMessage);
        throw new Error(errorMessage);
    }

    private getType(val): string {

        if (Array.isArray(val)) {
            return 'array'
        }
        else if (val === null) {
            return 'null'
        }
        return typeof val;
    }

    private isMessageAllowed(message): boolean {
        if (!message.origin) {
            this.doError(this.NoMessageOriginString);
        }

        return message.origin === this.targetOrigin;
    }

    private postMessage(message) {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    }

}