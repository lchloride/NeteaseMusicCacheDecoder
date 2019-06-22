
var msgbox = {
    errorBox: function(msg) {
        ipcRenderer.send('open-error-dialog', msg);
    },
    messageBox: function(msg) {
        ipcRenderer.send('open-info-dialog', msg);
    },
    warningBox: function(msg) {
        ipcRenderer.send('open-warn-dialog', msg);
    }
};

var logger = {
    info: function(content, type, handler) {
        if (type === 'dialog') {
            msgbox.messageBox(content);
        } else if (type === 'custom') {
            handler(content);
        } else if (type === 'batch') {
            $('#')
        }
    }
}