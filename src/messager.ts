enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

interface MessageError {
    description: string,
    detail: string,
    originalMessage?: Message;
};

interface Message {
    id: string,
    type: MessageType,
    verb: string,    
    body: {},
    origin: string,    
    error?: MessageError | {}
}

interface MessagerOptions {
    targetWindow: Window,
    targetOrigin: string,
    messageOrigin: string,
    bodyStructures?: object,
    receivedCallbacks?: object
}

class Messager {
    private responsePromises: object = {};

    constructor(private options: MessagerOptions) {
        const error = this.validateMessagerOptions(options);
        if (error) {
            throw error;
        }

        options.targetWindow = options.targetWindow || window.parent;
        options.targetOrigin = options.targetOrigin || '*';
        options.messageOrigin = options.messageOrigin || 'default-origin'
        options.bodyStructures = options.bodyStructures || {};
        options.receivedCallbacks = options.receivedCallbacks || {};

        window.addEventListener('message', (event) => this.receiveMessage);
    }

    /**
     * Main Public Api 
     */

    createMessage(verb: string, id?: string, body?: object, type?: MessageType, error?: object)
        : Message {
        const message: Message = {
            id: id || this.createGuid(),
            verb: verb,
            type: type || MessageType.Request,
            origin: this.options.messageOrigin,
            body: body || {}
        }
        if (error) {
            message.error = error;
        }
        return message;
    }

    createErrorMessage(verb: string, error: MessageError): Message {
        const message = this.createMessage(verb);
        message.error = error;
        return message;
    }

    createRequestMessage(verb: string, body?: object): Message {
        return this.createMessage(verb, undefined, body, MessageType.Request);
    }

    createResponseMessage(verb: string, id: string, body?: object): Message {
        return this.createMessage(verb, id, body, MessageType.Response);
    }

    receiveMessage(messageEvent: MessageEvent): void {        
        const messageEventError = this.validateMessageEvent(messageEvent);
        if (messageEventError) {
            throw messageEventError;
        }

        let data = JSON.parse(messageEvent.data);

        const messageStructure = {
            id: 'string',
            verb: 'string',
            type: ['REQUEST', 'RESPONSE'],
            origin: 'string',
            body: {}
        };
        const messageStructureErrors = this.validateStructure(data, messageStructure);
        if (messageStructureErrors.length > 0) {
            throw messageStructureErrors.join();
        }

        const key = this.buildKey(data.verb, data.type);
        const messageBodyErrors = this.validateStructure(data.body, this.options.bodyStructures[key]);
        if (messageBodyErrors.length > 0) {
            this.sendErrorMessage('Invalid Message Body Received', messageBodyErrors.join(), data);
        }
        
        if (data.type = MessageType.Response) {
            this.invokeResponsePromiseFunction(data, messageBodyErrors.length > 0 ? messageBodyErrors.join() : undefined);
        }
        if (messageBodyErrors.length === 0) {
            this.invokeReceivedCallback(data);
        };
    }

    sendMessage(message: Message): PromiseLike<{}> {
        return new Promise((resolve, reject) => {
            this.responsePromises[message.id] = this.createPromiseFunction(resolve, reject);
            this.postMessage(message);
        });
    }

    validateStructure(data: object, structure: object): string[] {
        if (this.getType(structure) !== 'object') {
            return [];
        }
        let errors = [];
        for (const key of Object.keys(structure)) {
            const val1 = structure[key];
            const val2 = data ? data[key] : undefined;
            const type1 = this.getType(val1);
            const type2 = val2 ? this.getType(val2) : undefined;

            if (!val2 && ((type1 === 'string' && !val1.endsWith('?')) || type1 !== 'string')) {
                errors.push(`Missing property ${key}`);
            }
            else if (type1 === 'array' && !val1.contains(val2)) {
                errors.push(`Property ${key} with value ${val2} does not exist in array [${val1}]`);
            }
            else if (type1 === 'object') {
                errors = [...errors, ...this.validateStructure(val2, val1)];
            }
            else if (type1 === 'string' && (val1 === 'boolean' || val1 === 'number') && val1 !== type2) {
                errors.push(`Property ${key} is a ${type2} instead of a ${val1}`);
            }
        }
        return errors;
    }

    /* 
    ** Public Methods    
    */

    getOptions(): MessagerOptions {
        return this.options;
    }

    addBodyStructure(type: MessageType, verb: string, structure: object): void {
        const key = this.buildKey(type, verb);
        this.options.bodyStructures[key] = structure;
    }

    addReceivedCallBack(type: MessageType, verb: string, callback: Function): void {
        const key = this.buildKey(type, verb);
        this.options.receivedCallbacks[key] = callback;
    }

    /**
      * Private methods
    */

    private createMessageError(description: string, detail: string, originalMessage: Message): MessageError {
        return {
            description: description,
            detail: detail,
            originalMessage: originalMessage
        };
    }

    private buildKey(type: MessageType, verb: string): string {
        return `${type}.${verb}`;
    }

    private createPromiseFunction(resolve: (data?) => void, reject: (error?) => void): Function {
        return (data, error) => {
            if (error) {
                reject(error);
            }
            resolve(data);
        };
    }

    private invoker(invokee: Function, message: Message): Function {
        return function () {
            try {
                invokee();
            } catch (err) {
                this.sendErrorMessage('Error Invoking Function', err, message);
                throw err;
            }
        }
    }

    private invokeReceivedCallback(message: Message) {
        const key = this.buildKey(message.type, message.verb);
        const callback = this.options.receivedCallbacks[key];
        if (callback) {
            this.invoker(callback(message.body), message)();
        }
    }

    private invokeResponsePromiseFunction(message: Message, error?: string) {
        const f = this.responsePromises[message.id];
        if (f) {
            this.invoker(f(message.body, error), message)();
        }
    }

    private postMessage(message: Message): void {
        //this.options.targetWindow.postMessage(JSON.stringify(message), this.options.targetOrigin);
        window.parent.postMessage(JSON.stringify(message), this.options.targetOrigin);
    }

    private sendErrorMessage(description: string, detail: string, originalMessage: Message) {
        this.sendMessage(
            this.createErrorMessage(originalMessage.verb,
                this.createMessageError(description, detail, originalMessage)));
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

    private validateMessagerOptions(options: MessagerOptions): string {
        if (!options) {
            return 'MesssageOptions must have a value.';
        }
    }

    /**
     * Private Utlity methods  
     */

    private createGuid(): string {
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    }

    private getType(value: any): string {
        if (Array.isArray(value)) {
            return 'array'
        }
        else if (value === null) {
            return 'null'
        }
        return typeof value;
    }
}