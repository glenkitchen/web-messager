var Hosted = /** @class */ (function () {
    function Hosted() {
        this.initializeMessager();
        this.sendReadyMessage();
    }
    Hosted.prototype.initializeMessager = function () {
        this.msgr = new Messager({
            targetWindow: window.parent,
            targetOrigin: '*',
            messageOrigin: 'hosted'
        });
    };
    Hosted.prototype.sendReadyMessage = function () {
        this.msgr.sendMessage(this.msgr.createMessage(MessageNames.Ready));
    };
    return Hosted;
}());
//# sourceMappingURL=hosted.js.map