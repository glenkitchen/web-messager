var w = window, d = document, splitter;

splitter = {
    lastX: 0,
    leftEl: null,
    rightEl: null,    

    init: function (leftEl, handler, rightEl) {
        var self = this;

        this.leftEl = leftEl;
        this.rightEl = rightEl;

        handler.addEventListener('mousedown', function (evt) {
            evt.preventDefault();    /* prevent text selection */
            self.lastX = evt.clientX;
            w.addEventListener('mousemove', self.drag);
            w.addEventListener('mouseup', self.endDrag);
        });
    },

    drag: function (evt) {
        var wL, wR, wDiff = evt.clientX - splitter.lastX;

        wL = d.defaultView.getComputedStyle(splitter.leftEl, '').getPropertyValue('width');
        wR = d.defaultView.getComputedStyle(splitter.rightEl, '').getPropertyValue('width');
        wL = parseInt(wL, 10) + wDiff;
        wR = parseInt(wR, 10) - wDiff;
        splitter.leftEl.style.width = wL + 'px';
        splitter.rightEl.style.width = wR + 'px';
        
        splitter.lastX = evt.clientX;
    },

    endDrag: function () {
        w.removeEventListener('mousemove', splitter.drag);
        w.removeEventListener('mouseup', splitter.endDrag);
    }
};

splitter.init(
    $('#formsContainer')[0],
    $('#splitter1')[0],
    $('#iframeContainer')[0]);