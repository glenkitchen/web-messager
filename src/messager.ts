interface MessageKey {
    verb: string,
    type: MessageType
}

interface MessagerOptions {
    targetWindow: Window,
    targetOrigin: string,
    messageSource: string,
    mustLogError?: boolean,
    mustLogVerbose?: boolean,
    payloadStructures?: object,
    receivedCallbacks?: object
}

enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

class Messager {

    private targetWindow: Window;
    private targetOrigin: string;
    private messageSource: string;
    private mustLogError: boolean;
    private mustLogVerbose: boolean;
    private payloadStructures = new Map();
    private receivedCallbacks = new Map();
    private promises = new Map();
    private messageStructure = {
        verb: 'string',
        id: 'string',
        date: 'string',
        type: ['REQUEST', 'RESPONSE'],
        source: 'string',
        payload: {}
    };

    constructor(options: MessagerOptions) {

        this.targetWindow = options.targetWindow;
        this.targetOrigin = options.targetOrigin;
        this.messageSource = options.messageSource;
        this.mustLogVerbose = options.mustLogVerbose === false ? false : true;
        this.mustLogError = options.mustLogError === false ? false : true;

        if (options.payloadStructures) {
            for (const key of Object.keys(options.payloadStructures)) {
                this.payloadStructures.set(key, Object.assign({}, this.messageStructure,
                    options.payloadStructures[key]))
            }
        }

        if (options.receivedCallbacks) {
            for (const key of Object.keys(options.receivedCallbacks)) {
                this.receivedCallbacks.set(key, options.receivedCallbacks[key]);
            }
        }

        window.addEventListener('message', this.receiveMessage);
    }

    receiveMessage = (message) => {

        const error = this.validateReceivedMessage(message);
        if (error) {
            throw new Error(error);
        };

        if (!this.validReceivedOrigin(message) ||
            (this.validateMessage(message.data, this.messageStructure)).length > 0) {
            return;
        }

        const data = message.data;
        const key = this.createMessageKey(data.verb, data.type);

        const payloadErrors = this.validateMessage(data, this.getPayloadStructure(key));

        if (data.type === MessageType.Response) {
            this.invokePromiseFunction(data, payloadErrors.length > 0 ? payloadErrors : null);
        }

        if (payloadErrors.length > 0) {
            this.sendMessage(message.verb, this.createPayloadErrorMessage(message, payloadErrors));
            return;
        }

        this.invokeReceivedCallback(key, data.payload);

    }

    sendMessage = (verb: string, payload: object = null): PromiseLike<{}> => {

        if (!verb) {
            this.logError('Invalid verb parameter');
        }

        const id = this.createGuid();

        return new Promise((resolve, reject) => {
            this.promises.set(id, this.createPromiseFunction(resolve, reject));
            this.postMessage(this.createMessage(verb, id, MessageType.Request, payload));
        });
    }

    validateMessage = (data: object, structure: object): string[] => {

        let errors = [];

        if (!structure) {
            return errors;
        }

        for (const key of Object.keys(structure)) {

            const val1 = structure[key];
            const val2 = data ? data[key] : null;
            const type1 = this.getType(val1);
            const type2 = val2 ? this.getType(val2) : null;

            if (!val2) {
                if ((type1 === 'string' && !val1.endsWith('?')) || type1 !== 'string') {
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

        if (errors.length > 0) {
            this.logError(errors);
        }

        return errors;
    }

    private createGuid = (): string => {

        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-"
            + s4() + "-" + s4() + s4() + s4();
    }

    private createMessage = (verb: string, id: string, type: MessageType, payload: object, error: object = null)
        : object => {

        const message: any = {
            verb: verb,
            id: id,
            date: new Date().toLocaleString(),
            type: type,
            source: this.messageSource,
            payload: payload || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
    }

    private createPayloadErrorMessage = (message: any, errors: object)
        : object => {

        return this.createMessage(message.verb, message.id, MessageType.Request, message.payload, {
            errorDescription: "Invalid Payload Structure Received",
            errors: errors,
            originalMessageType: message.type
        });
    }

    private createMessageKey = (verb: string, type: MessageType): MessageKey => {

        return {
            verb,
            type
        }
    }

    private createPromiseFunction(resolve: (data?) => void, reject: (error?) => void) {

        return (data, error) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        };
    }

    private getPayloadStructure = (key: MessageKey): object => {

        let structure = this.payloadStructures.get(key);

        if (!structure) {
            structure = Object.assign({}, this.messageStructure);
            this.payloadStructures.set(key, structure);
        }

        return structure;
    }

    private getType = (val): string => {

        if (Array.isArray(val)) {
            return 'array'
        }
        else if (val === null) {
            return 'null'
        }

        return typeof val;
    }

    private invokeReceivedCallback = (key: MessageKey, payload: object) => {

        const callback = this.receivedCallbacks.get(key);

        if (callback) {
            callback(payload);
        }
    }

    private invokePromiseFunction = (data: any, errors: string[]) => {

        const id = data.id;
        const fn = this.promises.get(id);

        if (fn) {
            fn(data, errors);
        }
        else {
            this.logVerbose(`No Promise for a RESPONSE message with id ${id}`, data);
        }
    }

    private logError = (message) => {

        if (this.mustLogError) {
            console.error('Messager', message);
        }
    }

    private logVerbose = (message, detail = null) => {

        if (this.mustLogVerbose) {
            console.info('Messager', message, detail)
        }
    }

    private postMessage = (message) => {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    }

    private validateReceivedMessage = (message): string => {

        let err;

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
            this.logError(err);
            return err;
        }

        return '';
    }

    private validReceivedOrigin = (message): boolean => {

        if (message.origin !== this.targetOrigin) {
            const text = `The message with origin: ${message.origin} 
                          is not for this target origin: ${this.targetOrigin}`;
            this.logVerbose(text, message);
            return false;
        }

        return true;
    }

}