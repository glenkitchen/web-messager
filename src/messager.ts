enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

interface MessageKey {
    verb: string,
    type: MessageType
}

interface MessageError {
    errorDescription: string,
    errors: string[],
    originalMessage: MessageStructure
}

interface MessageStructure {
    verb: string,
    id: string,
    date: string,
    type: ['REQUEST', 'RESPONSE'],
    source: string,
    payload: {},
    error?: MessageError
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

    receiveMessage = (messageEvent: MessageEvent): void => {
        const messageEventError = this.validateMessageEvent(messageEvent);
        if (messageEventError) {
            this.logAndThrowError(messageEventError);
        }

        const originValidationMessage = this.validateMessageEventOrigin(messageEvent);
        if (originValidationMessage) {
            this.logVerbose(originValidationMessage)
            return;
        }

        let data;
        try {
            data = JSON.parse(messageEvent.data);    
        } catch (error) {
           this.logAndThrowError(error); 
        }
        
        const messageStructure = {
            verb: 'string',
            id: 'string',
            date: 'string',
            type: ['REQUEST', 'RESPONSE'],
            source: 'string',
            payload: {}
        };
        if ((this.validateMessage(data, messageStructure)).length > 0) {
            return;
        }
                
        const key = this.createMessageKey(data.verb, data.type);

        const payloadErrors = this.validateMessage(data.payload, this.payloadStructures.get(key));
        if (payloadErrors.length > 0) {
            this.sendMessage(data.verb, this.createErrorObject(
                'Invalid Payload Received', payloadErrors, messageEvent.data, ));
        }

        if (data.type === MessageType.Request && payloadErrors.length === 0) {
            this.invokeRequestCallback(messageEvent);
        }
        else if (data.type = MessageType.Response) {
            this.invokeResponsePromise(messageEvent, payloadErrors.length > 0 ? payloadErrors : null);
        }
    }

    sendMessage = (verb: string, payload: object = null, error: MessageError = null): PromiseLike<{}> => {
        if (!verb) {
            this.logAndThrowError('Invalid verb parameter in sendMessage');
        }

        const id = this.createGuid();

        return new Promise((resolve, reject) => {
            this.responsePromises.set(id, this.createPromiseFunction(resolve, reject));
            this.postMessage(this.createMessage(verb, id, MessageType.Request, payload, error));
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

    validateMessageEvent = (messageEvent: MessageEvent): string => {
        if (!messageEvent) {
            return 'Invalid MessageEvent. The MessageEvent is falsy.';
        }
        else if (!messageEvent.origin) {
            return 'Invalid MessageEvent. The MessageEvent has no origin.';
        }
        else if (!messageEvent.data) {
            return 'Invalid MessageEvent. The MessageEvent has no data.';
        }
        return '';
    }

    private createGuid = (): string => {

        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-"
            + s4() + "-" + s4() + s4() + s4();
    }

    private createErrorObject = (description: string, errors: string[], originalMessage: MessageStructure)
        : MessageError => {
        return {
            errorDescription: description,
            errors: errors,
            originalMessage: originalMessage
        };
    }

    private createMessage = (verb: string, id: string = null, type: MessageType = null,
        payload: object = null, error: MessageError = null)
        : MessageStructure => {

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
                    this.createErrorObject('Error Invoking Request Callback', error, message));
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
                    this.createErrorObject('Error Invoking Response Promise', error, message));
            }
        }
        else {
            this.logVerbose(`No Promise for a RESPONSE message with id ${data.id}`, data);
        }
    }

    private logError = (message: string | string[]): void => {
        if (this.mustLogError) {
            console.error('Messager', message);
        }
    }

    private logAndThrowError = (message: string): void => {
        this.logError(message);
        throw new Error(message);
    }

    private logVerbose = (message: string, detail = null): void => {
        if (this.mustLogVerbose) {
            console.info('Messager', message, detail)
        }
    }

    private postMessage = (message: MessageStructure): void => {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    }

    private validateMessageEventOrigin = (messageEvent: MessageEvent): string => {
        if (messageEvent.origin !== this.targetOrigin) {
            return `The message with origin: ${messageEvent.origin}` +
                `is not for this target origin: ${this.targetOrigin}`
        }
        return '';
    }
}