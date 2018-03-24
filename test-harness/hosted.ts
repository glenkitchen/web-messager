class Hosted {
    private msgr: Messager;

    constructor() {        
        this.initializeMessager();       
        this.sendReadyMessage();
    }

    private initializeMessager() : void {
        this.msgr = new Messager({
            targetWindow: window.parent,
            targetOrigin: '*',
            messageOrigin: 'hosted'
        });
    }

    private sendReadyMessage() : void {                
        this.msgr.sendMessage(
            this.msgr.createMessage(MessageNames.Ready));
    }
} 