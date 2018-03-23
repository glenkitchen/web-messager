var Host = /** @class */ (function () {
    function Host() {
        this.initializeMessager();
    }
    Host.prototype.initializeMessager = function () {
        var messager = new Messager({
            targetWindow: window,
            targetOrigin: '*',
            messageOrigin: ''
        });
    };
    return Host;
}());
//# sourceMappingURL=host.js.map