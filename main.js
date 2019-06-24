"use strict"
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const title = "网易云音乐缓存解码器 v3.1";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 960,
        height: 720,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    win.loadFile('index.html')

    // Open the DevTools.
    win.webContents.openDevTools()

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('open-error-dialog', function (event, arg) {
    showDialog({
        type: 'error',
        title: title,
        message: arg
    });
});

ipcMain.on('open-info-dialog', function (event, arg) {
    showDialog({
        type: 'info',
        title: title,
        message: arg
    });

});

ipcMain.on('open-warn-dialog', function (event, arg) {
    showDialog({
        type: 'warning',
        title: title,
        message: arg
    });

});

function showDialog(options) {
    if (options instanceof Object) {
        if (options.type === undefined || options.type === null) {
            options.type = 'info';
        }
        if (options.title === undefined || options.title === null) {
            options.title = title;
        }
        if (options.message === undefined || options.message === null) {
            options.message = '';
        }
    } else {
        options = {
            type: 'info',
            title: title,
            message: ''
        };
    }
    // On macOS message is like title while detail is like message.
    // Title does not in use.
    if (process.platform === 'darwin') {
        options.detail = ""+options.message;
        options.message = title;
    }
    dialog.showMessageBox(options);
    
}

ipcMain.on('open-file-dialog', (event, options) => {
    dialog.showOpenDialog(options, (file) => {
        if (file) {
            event.sender.send('selected-file', file);
        } else {
            event.sender.send('selected-file', []);
        }
    });
});

ipcMain.on('get-meta-info', (event, arg) => {
  const { net } = require('electron')
  const request = net.request('http://music.163.com/api/song/detail/?id='+arg+'&ids=['+arg+']');
  var body = '';

  request.on('error', (error) => {
    console.log(error.message);
    event.sender.send('get-meta-info-response-'+arg, error.message);
  });
  request.on('response', (response) => {
    console.log(`STATUS: ${response.statusCode}`)
    console.log(`HEADERS: ${JSON.stringify(response.headers)}`)
    response.on('data', (chunk) => {
      console.log(`BODY: ${chunk}`);
      body += chunk;
    })
    response.on('end', () => {
      console.log('No more data in response.');
      event.sender.send('get-meta-info-response-'+arg, body);
    })
  })
  
  request.end()
})

