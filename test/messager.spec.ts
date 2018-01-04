describe("Messager", () => {

    var msgr;
    const verb = 'TESTVERB';
    const payload = { test: 'abc'};

    beforeEach(() => {
        msgr = new Messager({
            window: window.parent,
            origin: '*',
            targetOrigin: '*'
        });
    })

    it("send creates a Guid", () => {
        spyOn(msgr, "createGuid");
        msgr.send(verb, payload);
        expect(msgr.createGuid).toHaveBeenCalledWith();
    });

    it("send creates a message", () => {
        spyOn(msgr, "createMessage");
        msgr.send(verb, payload);
        expect(msgr.createMessage).toHaveBeenCalledWith(verb, '', );
    });
  
});