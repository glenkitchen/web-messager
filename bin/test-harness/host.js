var Host = /** @class */ (function () {
    function Host() {
        this.getElements();
        this.getElementValues();
        this.initializeEvents();
        this.initializeMessager();
        this.loadIframe(null);
    }
    Host.prototype.getElements = function () {
        var _this = this;
        ['hostedIframe'].forEach(function (id) {
            _this[id] = document.getElementById(id);
        });
    };
    Host.prototype.getElementValues = function () {
        var _this = this;
        ['rectangles', 'iframeUrl', 'iframeAction'].forEach(function (id) {
            _this[id + 'Val'] = document.getElementById(id).value;
        });
    };
    Host.prototype.initializeEvents = function () {
        var _this = this;
        document.getElementById('loadIframe')
            .addEventListener('click', function (event) {
            _this.loadIframe(event);
        });
    };
    Host.prototype.initializeMessager = function () {
        var messager = new Messager({
            targetWindow: this.hostedIframe.contentWindow,
            targetOrigin: '*',
            messageOrigin: 'host'
        });
    };
    Host.prototype.loadIframe = function (event) {
        if (this.iframeActionVal === 'POST') {
        }
        else {
            this.hostedIframe.src = this.iframeUrlVal;
        }
    };
    return Host;
}());
//# sourceMappingURL=host.js.map