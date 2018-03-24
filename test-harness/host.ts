class Host {
    private messager: Messager;

    // Elements
    private hostedIframe : HTMLIFrameElement;
    
    // Elements Values
    private rectanglesVal;
    private iframeUrlVal;
    private iframeActionVal;

    constructor() {             
        this.getElements();
        this.getElementValues();
        this.initializeEvents();
        this.initializeMessager();
        this.loadIframe(null);
    }

    private getElements() {
        ['hostedIframe'].forEach(id => {
            this[id] = document.getElementById(id);   
       });
    }

    private getElementValues() {
        ['rectangles', 'iframeUrl', 'iframeAction'].forEach(id => {
             this[id+ 'Val'] = (<any>document.getElementById(id)).value;   
        });
    }

    private initializeEvents() {
        document.getElementById('loadIframe')
            .addEventListener('click', (event) => {
                  this.loadIframe(event);  
            });
    }

    private initializeMessager() {
        const messager = new Messager({
            targetWindow: this.hostedIframe.contentWindow,
            targetOrigin: '*',
            messageOrigin: 'host'
        });
    }

    private loadIframe(event) {
        if (this.iframeActionVal === 'POST') {
        }
        else {
            this.hostedIframe.src = this.iframeUrlVal;
        }
    }
} 