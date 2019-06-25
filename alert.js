
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
        console.log(content, type);
        if (type === undefined || type === null || type === 'dialog') {
            msgbox.messageBox(content);
        } else if (type === 'custom') {
            handler(content);
        } else if (type === 'batch') {
            $('#batch_logger').append('<p >'+content+'</p>');
        }
    },
    error: function (content, type, handler) {
        console.error(content, type);
        if (type === undefined || type === null || type === 'dialog') {
            msgbox.errorBox(content);
        } else if (type === 'custom') {
            handler(content);
        } else if (type === 'batch') {
            $('#batch_logger').append('<p class="text-danger">'+content+'</p>');
        }
    },
    warn: function (content, type, handler) {
        if (type === undefined || type === null || type === 'dialog') {
            msgbox.warningBox(content);
        } else if (type === 'custom') {
            handler(content);
        } else if (type === 'batch') {
            $('#batch_logger').append('<p class="text-warning">'+content+'</p>');
        }
    }, 
    primary: function (content, type, handler) {
        if (type === undefined || type === null || type === 'dialog') {
            msgbox.messageBox(content);
        } else if (type === 'custom') {
            handler(content);
        } else if (type === 'batch') {
            $('#batch_logger').append('<p class="text-primary">'+content+'</p>');
        }
    }, 
}