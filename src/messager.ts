interface MessagerOptions {
    targetWindow: Window,
    targetOrigin: string,
    messageSource: string,
    mustLogInfo?: boolean,
    messageStructures?: object,
    receivedCallbacks?: object
}

enum MessageType {
    Request = 'REQUEST',
    Response = 'RESPONSE'
}

interface MessageKey {
    verb: string,
    type: MessageType
}

class Messager {

    private targetWindow: Window;
    private targetOrigin: string;
    private messageSource: string;
    private mustLogInfo: boolean;
    private messageStructures = new Map();
    private receivedCallbacks = new Map();

    private promises = new Map();
    private baseMessageStructure = {
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
        this.mustLogInfo = options.mustLogInfo || true;

        if (options.messageStructures) {
            for (const key of Object.keys(options.messageStructures)) {
                this.messageStructures.set(key, Object.assign({}, this.baseMessageStructure,
                    options.messageStructures[key]))
            }
        }

        if (options.receivedCallbacks) {
            for (const key of Object.keys(options.receivedCallbacks)) {
                this.receivedCallbacks.set(key, options.receivedCallbacks[key]);
            }
        }

        window.addEventListener("message", this.receiveMessage);
    }

    receiveMessage(message) {

        if (!this.validateReceivedMessage(message)) {
            return;
        }

        const data = message.data;
        const key = this.createMessageKey(message.verb, message.type);

        this.validateMessage(data, this.getMessageStructure(key));

        if (message.type === MessageType.Response) {
            this.invokeResolver(data.id, data.payload);
        }

        this.invokeReceivedCallback(key, data.payload);
    }


    sendMessage(verb: string, payload: object = null) {

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

    validateMessage(data: object, structure: object): string[] {
        let errors = [];

        for (const key of Object.keys(structure)) {
            const val1 = structure[key];
            const val2 = data[key];
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

    private createGuid(): string {

        const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);

        return s4() + s4() + "-" + s4() + "-" + s4() + "-"
            + s4() + "-" + s4() + s4() + s4();
    }

    private createMessage(verb: string, id: string, type: MessageType, payload: object, error: object = null): object {

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

    private createMessageKey(verb: string, type: MessageType): MessageKey {
        return {
            verb,
            type
        }
    }

    private doError(errorMessage) {
        console.error('Messager', errorMessage);
        throw new Error(errorMessage);
    }

    private getMessageStructure(key: MessageKey): object {
        let structure = this.messageStructures.get(key);
        if (!structure) {
            this.messageStructures.set(key, Object.assign({}, this.baseMessageStructure));
            structure = this.messageStructures.get(key);
        }
        return structure;
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

    private invokeReceivedCallback(key: MessageKey, payload: object) {
        const callback = this.receivedCallbacks.get(key);
        if (callback) {
            callback(payload);
        }
    }

    private invokeResolver(id: string, payload: object) {
        const resolver = this.promises.get(id);
        if (resolver) {
            resolver(payload);
        }
        else {
            this.logInfo(`No Promise for a RESPONSE message with id ${id}`);
        }
    }

    private logInfo(message) {
        if (this.mustLogInfo) {
            console.info('Messager', message)
        }
    }

    private postMessage(message) {
        this.targetWindow.postMessage(JSON.stringify(message), this.targetOrigin);
    }

    private validateMessageProperty(obj: any, props: string[]) {
        props.forEach((prop) => {
            if (!obj[prop]) {
                this.doError(`The message has no ${prop}`);
            }
        });
    };

    private validateReceivedMessage(message): boolean {
        if (!message) {
            this.doError('Invalid message received');
        }

        this.validateMessageProperty(message, ['origin', 'data']);
        this.validateMessageProperty(message.data, ['verb', 'id', 'date', 'type', 'source', 'payload']);

        return message.origin === this.targetOrigin;
    }
}