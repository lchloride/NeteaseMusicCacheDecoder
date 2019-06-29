
var last_progress = 0;
ipcRenderer.on('get-latest-version-file-progress', (event, progress) => {
    if (last_progress.toFixed(0) !== progress.toFixed(0)) {
        $('#download_progressbar').css('width', progress + '%');
        last_progress = progress;
    }
    if (last_progress.toFixed(1) !== progress.toFixed(1)) {
        $('#download_progress').text('进度：' + progress.toFixed(2)+'%');
        last_progress = progress;
    }
})

var version_obj =  {};

function checkUpdate() {
    $('#update_wrapper').css('display', 'none');
    ipcRenderer.send('get-latest-version-info');
    ipcRenderer.once('get-latest-version-info-response', (event, body) => {
        if (body === undefined || body === null || body.length === 0) {
            msgbox.errorBox('获取更新信息失败');
            return
        }
        if (body === 'net::ERR_INTERNET_DISCONNECTED') {
            logger.error('网络无法连接');
            return
        } else if (body.startsWith('net')) {
            logger.error('网络错误:' + body);
            return
        }
        var obj = JSON.parse(body);
        version_obj = obj;
        // Check version info
        // A newer version is found
        if (compareVersion(version, obj['version']) < 0) {
            $('#update_wrapper').css('display', 'block');
            $('#update_version').text(obj['version']);
            $('#update_level').text(obj['level']);
            $('#update_date').text(obj['release_date']);
            $('#update_info').text(obj['info']['zh_cn']);
        }
    });
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
            $('#download_progress').text('进度：' + '100%');
            $('#download_progressbar').css('width',  '100%');
            var downloadMD5 = crypto.createHash('md5').update(body).digest("hex");
            if (downloadMD5 !== version_obj['md5'][platform]) {
                msgbox.errorBox('下载内容校验失败，请重新下载');
                return;
            }
            try {
                fs.writeFileSync(filename, body, 'binary');
            } catch (e) {
                msgbox.errorBox("出错:" + e.message);
                return;
            }
            msgbox.messageBox('下载新版本完成，请解压覆盖原版本文件。');
        })
    })
}

function genereateFileMD5(filename) {
    var content = fs.readFileSync(filename)
    var result = crypto.createHash('md5').update(content).digest("hex")
    console.log(result);
}


