describe("Messager", function () {
    var msgr;
    var verb = 'TESTVERB';
    var payload = { test: 'abc' };
    beforeEach(function () {
        msgr = new Messager({
            window: window.parent,
            origin: '*',
            targetOrigin: '*'
        });
    });
    it("send creates a Guid", function () {
        spyOn(msgr, "createGuid");
        msgr.send(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalledWith();
    });
    it("send creates a message", function () {
        spyOn(msgr, "createMessage");
        msgr.send(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, '');
    });
});
//# sourceMappingURL=messager.spec.js.map