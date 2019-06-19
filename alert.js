
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