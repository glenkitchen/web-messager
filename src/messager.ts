enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

interface MessageError {
    errorDescription: string,
    errors: string[],
    originalMessage: MessageStructure
}

interface MessageStructure {
    id: string,
    verb: string,
    type: MessageType,
    origin: string,
    body: {},
    error?: MessageError
}

interface MessagerOptions {
    targetWindow: Window,
    targetOrigin: string,
    messageOrigin: string,
    bodyStructures?: object,
    receivedCallbacks?: object
}

class Messager {
    private responsePromises: object;

    constructor(private options: MessagerOptions) {
        const error = this.validateMessageOptions(options);
        this.logAndThrowError(error);

        options.targetWindow = options.targetWindow || window.parent;
        options.targetOrigin = options.targetOrigin || '*';
        options.messageOrigin = options.messageOrigin || 'default-origin'
        options.bodyStructures = options.bodyStructures || {};
        options.receivedCallbacks = options.receivedCallbacks || {};

        window.addEventListener('message', this.receiveMessage);
    }

    /**
     * Main Public Api 
     */

    createMessage(verb: string, id: string = null, type: MessageType = null,
        body: object = null, error: MessageError = null)
        : MessageStructure {

        const message: any = {
            id: id || this.createGuid(),
            verb: verb,           
            type: type || MessageType.Request,
            source: this.options.messageOrigin,
            body: body || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
    }

    createErrorMessage() {
    }

    createRequestMessage() {
    }

    createResponseMessage() {
    }

    receiveMessage(messageEvent: MessageEvent): void {
        const messageEventError = this.validateMessageEvent(messageEvent);
        if (messageEventError) {
            this.logAndThrowError(messageEventError);
        }

        let data;
        try {
            data = JSON.parse(messageEvent.data);
        } catch (error) {
            this.logAndThrowError(error);
        }

        const messageStructure = {
            id: 'string',
            verb: 'string',            
            type: ['REQUEST', 'RESPONSE'],
            origin: 'string',
            bodt: {}
        };
        if ((this.validateMessage(data, messageStructure)).length > 0) {
            return;
        }

        const key = this.createMessageKey(data.verb, data.type);

        const bodyErrors = null; // this.validateMessage(data.body, this.options.bodyStructures[key]);
        if (bodyErrors.length > 0) {
            this.sendMessage(data.verb, this.createErrorObject(
                'Invalid Body Received', bodyErrors, messageEvent.data, ));
        }

        if (data.type === MessageType.Request && bodyErrors.length === 0) {
            this.invokeReceivedCallback(messageEvent);
        }
        else if (data.type = MessageType.Response) {
            this.invokeResponsePromise(messageEvent, bodyErrors.length > 0 ? bodyErrors : null);
        }
    }

    sendMessage(verb: string, body: object = null, error: MessageError = null): PromiseLike<{}> {
        if (!verb) {
            this.logAndThrowError('Invalid verb parameter in sendMessage');
        }

        const id = this.createGuid();

        return new Promise((resolve, reject) => {
            //TODO this.responsePromises.set(id, this.createPromiseFunction(resolve, reject));
            this.postMessage(this.createMessage(verb, id, MessageType.Request, body, error));
        });
    }

    validateMessage (data: object, structure: object): string[] {
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

    /* 
    ** Public Methods    
    */

    getOptions(): MessagerOptions {
        return this.options;
    }

    addBodyStructure(verb: string, type: MessageType, structure: object) : void {
        const key = this.createMessageKey(verb, type);
        this.options.bodyStructures[key]= structure;
    }

    addReceivedCallBack(verb: string, type: MessageType, receivedCallback: Function) : void {
        const key = this.createMessageKey(verb, type);
        this.options.receivedCallbacks[key]= receivedCallback;
    }

    /**
      * Private methods
    */

    private createErrorObject(description: string, errors: string[], originalMessage: MessageStructure)
        : MessageError {
        return {
            errorDescription: description,
            errors: errors,
            originalMessage: originalMessage
        };
    }

    private createMessageKey(verb: string, type: MessageType): string {
        return verb + type;
    }

    private createPromiseFunction(resolve: (data?) => void, reject: (error?) => void) {
        return (data, error) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        };
    }

    private invokeReceivedCallback(message) {
        const callback = null;// TODO= this.options.receivedCallbacks(message.verb);

        if (callback) {
            try {
                callback(message.data.body);
            } catch (error) {
                this.logError(error);
                this.sendMessage(message.verb,
                    this.createErrorObject('Error Invoking Request Callback', error, message));
            }
        }
    }

    private invokeResponsePromise(message, errors) {
        const data = message.data;
        const fn = this.responsePromises[data.id];

        if (fn) {
            try {
                fn(data.body, errors);
            } catch (error) {
                this.logError(error);
                this.sendMessage(message.verb,
                    this.createErrorObject('Error Invoking Response Promise', error, message));
            }
        }
    }

    private logError(errorMessage: string | string[]): void {
        console.error('Messager', errorMessage);
    }

    private logAndThrowError(errorMessage: string): void {
        this.logError(errorMessage);
        throw new Error('Messager' + errorMessage);
    }

    private postMessage(message: MessageStructure): void {
        this.options.targetWindow.postMessage(JSON.stringify(message), this.options.targetOrigin);
    }

    private validateMessageEvent(messageEvent: MessageEvent): string {
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
            return `This message: ${messageEvent} is not for this target origin: ${this.options.targetOrigin}`
        }
        return '';
    }

    private validateMessageOptions(options: MessagerOptions): string {
        if (!options) {
            return 'MesssageOptions must have a value.';
        }
        else if (this.getType(options.bodyStructures) !== 'object') {
            return 'MesssageOptions bodyStructures must be an object.';
        }
        else if (this.getType(options.receivedCallbacks) !== 'object') {
            return 'MesssageOptions receivedCallbacks must be an object.';
        }
    }

    /**
     * Utlity methods  
     */

    private createGuid(): string {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)  
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
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

}