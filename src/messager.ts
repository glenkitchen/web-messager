enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

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
    requestCallbacks?: object
}

class Messager {
    private targetWindow: Window;
    private targetOrigin: string;
    private messageSource: string;
    private mustLogError: boolean;
    private mustLogVerbose: boolean;
    private payloadStructures = new Map();
    private requestCallbacks = new Map();
    private responsePromises = new Map();
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
        this.mustLogError = options.mustLogError === false ? false : true;
        this.mustLogVerbose = options.mustLogVerbose === false ? false : true;

        if (options.payloadStructures) {
            for (const key of Object.keys(options.payloadStructures)) {
                this.payloadStructures.set(key, options.payloadStructures[key]);
            }
        }

        if (options.requestCallbacks) {
            for (const key of Object.keys(options.requestCallbacks)) {
                this.requestCallbacks.set(key, options.requestCallbacks[key]);
            }
        }

        window.addEventListener('message', this.receiveMessage);
    }

    receiveMessage = (message) => {
        this.validateReceivedMessage(message);

        if (!this.validReceivedOrigin(message) ||
            (this.validateMessage(message.data, this.messageStructure)).length > 0) {
            return;
        }

        const data = message.data;
        const key = this.createMessageKey(data.verb, data.type);
        
        const payloadErrors = this.validateMessage(data.payload, this.payloadStructures.get(key));        
        if (payloadErrors) {
            this.sendMessage(message.verb, this.createErrorPayload(
                'Invalid Payload Received', message.payload, payloadErrors));
        }

        if (data.type === MessageType.Request && !payloadErrors) {
            this.invokeRequestCallback(message);

            
        }
        else if (data.type = MessageType.Response) {
            this.invokeResponsePromise(message, payloadErrors.length > 0 ? payloadErrors : null);
        }
    }

    sendMessage = (verb: string, payload: object = null, errors: object = null): PromiseLike<{}> => {
        if (!verb) {
            this.logAndThrowError('Invalid verb parameter in sendMessage');
        }

        const id = this.createGuid();

        return new Promise((resolve, reject) => {
            this.responsePromises.set(id, this.createPromiseFunction(resolve, reject));
            this.postMessage(this.createMessage(verb, id, MessageType.Request, payload, errors));
        });
    }

    validateMessage = (data: object, structure: object): string[] => {
        if (!structure) {
            return [];
        }

        let errors = [];

        for (const key of Object.keys(structure)) {
            const val1 = structure[key];
            const val2 = data ? data[key] : null;
            const type1 = this.getType(val1);
            const type2 = val2 ? this.getType(val2) : null;

            if (!val2) {
                if ((type1 === 'string' && !val1.endsWith('?')) || type1 !== 'string') {
                    errors.push(`Validate Message. Missing message property ${key}`);
                }
            }
            else if (type1 === 'array') {
                if (val1.findIndex(x => x === val2) < 0) {
                    errors.push(`Validate Message. ` +
                        `Message property ${key} with value ${val2} does not exist in array [${val1}]`);
                }
            }
            else if (type1 === 'object') {
                errors = [...errors, ...this.validateMessage(val2, val1)];
            }
            else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number')) {
                if (val1 !== type2) {
                    errors.push(`Validate Message. Message property ${key} is a ${type2} instead of a ${val1}`);
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

    private createErrorPayload = (description: string, errors: object, originalMessage: object): object => {
        return {
            errorDescription: description,
            errors: errors,
            originalMessage: originalMessage
        };
    }

    private createMessage = (verb: string, id: string = null, type: MessageType = null,
        payload: object = null, error: object = null)
        : object => {

        const message: any = {
            verb: verb,
            id: id || this.createGuid(),
            date: new Date().toLocaleString(),
            type: type || MessageType.Request,
            source: this.messageSource,
            payload: payload || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
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

    private getType = (val): string => {
        if (Array.isArray(val)) {
            return 'array'
        }
        else if (val === null) {
            return 'null'
        }
        return typeof val;
    }

    private invokeRequestCallback = (message) => {
        const callback = this.requestCallbacks.get(message.verb);

        if (callback) {
            try {
                callback(message.data.payload);
            } catch (error) {
                this.logError(error);
                this.sendMessage(message.verb,
                    this.createErrorPayload('Error Invoking Request Callback', error, message));
            }
        }
    }

    private invokeResponsePromise = (message, errors) => {
        const data = message.data;
        const fn = this.responsePromises.get(data.id);

        if (fn) {
            try {
                fn(data.payload, errors);
            } catch (error) {
                this.logError(error);
                this.sendMessage(message.verb,
                    this.createErrorPayload('Error Invoking Response Promise', error, message));
            }
        }
        else {
            this.logVerbose(`No Promise for a RESPONSE message with id ${data.id}`, data);
        }
    }

    private logError = (message) => {
        if (this.mustLogError) {
            console.error('Messager', message);
        }
    }

    private logAndThrowError = (message) => {
        this.logError(message);
        throw new Error(message);
    }

    private logVerbose = (message, detail = null) => {
        if (this.mustLogVerbose) {
            console.info('Messager', message, detail)
        }
    }

    private postMessage = (message) => {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    }

    private validateReceivedMessage = (message) => {
        if (!message) {
            this.logAndThrowError('Invalid message received');
        }
        else if (!message.origin) {
            this.logAndThrowError('Invalid message received. The message has no origin.');
        }
        else if (!message.data) {
            this.logAndThrowError('Invalid message received. The message has no data.');
        }
    }

    private validReceivedOrigin = (message): boolean => {
        if (message.origin !== this.targetOrigin) {
            const text = `The message with origin: ${message.origin}` +
                `is not for this target origin: ${this.targetOrigin}`;
            this.logVerbose(text, message);
            return false;
        }
        return true;
    }
}