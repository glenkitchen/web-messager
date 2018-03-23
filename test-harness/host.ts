class Host {
    private messager: Messager;

    constructor() {
        this.initializeMessager();
    }

    private initializeMessager() {
        const messager = new Messager({
            targetWindow: window,
            targetOrigin: '*',
            messageOrigin: ''
        });
    }
} 