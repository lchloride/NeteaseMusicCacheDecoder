
var last_progress = 0;
ipcRenderer.on('get-latest-version-file-progress', (event, progress) => {
    if (last_progress.toFixed(0) !== progress.toFixed(0)) {
        $('#download_progressbar').css('width', progress + '%');
        last_progress = progress;
    }
    if (last_progress.toFixed(1) !== progress.toFixed(1)) {
        $('#download_progress').text(langUtil.getTranslation('Code_Progress') + progress.toFixed(2)+'%');
        last_progress = progress;
    }
})

var version_obj =  {};

function checkUpdate(isManually) {
    $('#update_wrapper').css('display', 'none');
    ipcRenderer.send('get-latest-version-info');
    ipcRenderer.once('get-latest-version-info-response', (event, body) => {
        console.log(body);
        if (body === undefined || body === null || body.length === 0) {
            msgbox.errorBox(langUtil.getTranslation('Code_ObtainUpdateInfoFailure'));
            return
        }

        if (body === 'net::ERR_INTERNET_DISCONNECTED') {
            logger.error(langUtil.getTranslation('Code_ObtainUpdateInfoFailure')+' - '+ langUtil.getTranslation('Code_NetworkUnavailable'));
            return;
        } else if (body === 'net::ERR_CONNECTION_REFUSED') {
            logger.error(langUtil.getTranslation('Code_ObtainUpdateInfoFailure')+' - '+ langUtil.getTranslation('Code_ConnectionRefused'));
            return;
        } else if (body.startsWith('net::')) {
            logger.error(langUtil.getTranslation('Code_ObtainUpdateInfoFailure')+' - ' + body);
            return;
        }

        var obj = JSON.parse(body);
        version_obj = obj;
        // Check version info
        // A newer version is found
        if (compareVersion(version, obj['version']) < 0 && 
                ((compareVersion(settings.getSetting('ignore_version'), obj['version']) !== 0 && 
                isManually !== true) || isManually === true)) {
            $('#update_wrapper').css('display', 'block');
            $('#update_version').text(obj['version']);
            $('#update_level').text(getLevelDesc((obj['level'])));
            $('#update_date').text(obj['release_date']);
            $('#update_info').text(obj['info']['zh_cn']);
            $('#about_label').removeClass('label-danger label-warning label-info');
            if (obj['level'] === 'primary') {
                $('#about_label').css('display', 'inline').addClass('label-danger');
            } else if (obj['level'] === 'hotfix') {
                $('#about_label').css('display', 'inline').addClass('label-danger');
            } else if (obj['level'] === 'minor') {
                $('#about_label').css('display', 'inline').addClass('label-warning');
            } else if (obj['level'] === 'beta') {
                $('#about_label').css('display', 'inline').addClass('label-info');
            }
        }
    });
}

function getLevelDesc(level) {
    if (level === 'primary') {
        return langUtil.getTranslation('Code_Primary');
    } else if (level === 'hotfix') {
        return langUtil.getTranslation('Code_Hotfix');
    } else if (level === 'minor') {
        return langUtil.getTranslation('Code_Minor');
    } else if (level === 'beta') {
        return langUtil.getTranslation('Code_Beta');
    }
}

function compareVersion(v1, v2) {
    var v1List = v1.split('.');
    var v2List = v2.split('.');
    var i=0;
    for (i=v1List.length; i<3; i++) {
        v1List.push('0');
    }
    for (i=v2List.length; i<3; i++) {
        v2List.push('0');
    }
    for (i=0; i<3; i++) {
        if (v1List[i] != v2List[i]) {
            return parseInt(v1List[i]) - parseInt(v2List[i]);
        }
    }
    return 0;
}

$('#update_download').click((event) => {
    if (compareVersion(version, version_obj['version']) < 0) {
        var platform = 'win';
        if (process.platform === 'darwin') 
            platform = 'darwin'
        else if (process.platform === 'win32')
            platform = 'win'
        else
            platform = 'linux'

        updateProgram(version_obj['default_name'][platform], version_obj['url'][platform], platform);
    }
})

function updateProgram(default_name, url, platform) {
    ipcRenderer.send('save-dialog', default_name);
    ipcRenderer.once('save-dialog', (event, filename) => {
        console.log(filename);
        if (filename === undefined || filename === null || filename.length === 0) {
            return;
        }
        ipcRenderer.send('get-latest-version-file', url);
        ipcRenderer.once('get-latest-version-file-response', (event, body) => {
            console.log('Downloaded body size = '+body.length);
            $('#download_progress').text(langUtil.getTranslation('Code_Progress') + '100%');
            $('#download_progressbar').css('width',  '100%');
            var downloadMD5 = crypto.createHash('md5').update(body).digest("hex");
            if (downloadMD5 !== version_obj['md5'][platform]) {
                msgbox.errorBox(langUtil.getTranslation('Code_UpdateVerifyFailure'));
                return;
            }
            try {
                fs.writeFileSync(filename, body, 'binary');
            } catch (e) {
                msgbox.errorBox(langUtil.getTranslation('Code_UpdateWriteFailure') + e.message);
                return;
            }
            msgbox.messageBox(langUtil.getTranslation('Code_UpdateFinished'));
        })
    })
}

function genereateFileMD5(filename) {
    var content = fs.readFileSync(filename)
    var result = crypto.createHash('md5').update(content).digest("hex")
    console.log(result);
}

$('#update_ignore').click((event) => {
    settings.setSetting('ignore_version', version_obj['version']);
    settings.write();
    $('#update_wrapper').css('display', 'none');
    $('#about_label').css('display', 'none');
})

$(document).ready((event) => {
    checkUpdate();
    $('#check_update_btn').click((ev) => {
        checkUpdate(true);
    });
});

$('#quit_btn').click((event) => {
    ipcRenderer.send('quit');
})
