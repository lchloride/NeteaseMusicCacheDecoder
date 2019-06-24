var musicInfo = undefined;

(function ($, undefined) {
    $.fn.getCursorPosition = function () {
        var el = $(this).get(0);
        var pos = 0;
        if ('selectionStart' in el) {
            pos = el.selectionStart;
        } else if ('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }
})(jQuery);

$(document).ready((event) => {
    $("#rename_rule").val(settings.getSetting('single_rename_rule'));
    if (process.platform === 'darwin') {
        $('#default_cache_dir_wrapper').css('display', 'block');
    } else {
        $('#default_cache_dir_wrapper').css('display', 'none');
    }
});

/**
 * Callback when select source file
 */
$("#cache_file_selection_btn").click((e) => {
    getSelectedFileByDialog({
        properties: ['openFile'],
        filters: [
            { name: '网易云音乐缓存', extensions: ['uc', 'uc!'] }
        ],
        title: title,
        message: '选择一个音乐缓存文件',
        defaultPath: $("#default_cache_dir").is(":checked") ? replaceAll(settings.getSetting('macOS_default_cache_dir'), '%%Username%%', os.userInfo().username) : ''
    }, (files) => {
        if (files === undefined || files === null || files.length === 0) {
            $("#cache_file").val("");
        } else {
            $("#cache_file").val(files[0]);
        }
    });
    // os.userInfo().username
});

/**
 * Processor which get the selected file list from open dialog
 * @param {Object} options options for open dialog
 * @param {Function} callback do something when file list is back
 */
var dialogLock = 0;
function getSelectedFileByDialog(options, callback) {
    ipcRenderer.removeAllListeners('selected-file');
    
    // notify main thread to open file dialog
    ipcRenderer.send("open-file-dialog", options);

    // Get the file list from open dialog and trigger callback
    ipcRenderer.once('selected-file', (event, files) => {
        callback(files);
    });
}

/**
 * Callback when target_dir selection button clicked
 * Open dialog for target directory selection
 */
$("#target_dir_selection_btn").click((e) => {
    if (!($("#target_dir_using_cache").is(":checked"))) {
        getSelectedFileByDialog({
            properties: ['openDirectory'],
            title: title,
            message: '选择目标路径'
        }, (dirs) => {
            if (dirs === undefined || dirs === null || dirs.length === 0) {
                $("#target_dir").val("");
            } else {
                $("#target_dir").val(dirs[0]);
            }
        });
    }
});

/**
 * Callback on auto-renaming, re-enable/disable some feature
 */
$("#target_dir_using_cache").change((e) => {
    if ($("#target_dir_using_cache").is(":checked")) {
        $("#target_dir").attr("disabled", "disabled");
        $("#target_dir_selection_btn").addClass("disabled");
    } else {
        $("#target_dir").removeAttr("disabled");
        $("#target_dir_selection_btn").removeClass("disabled");
    }
});

/**
 * Modify renaming rule when rule-btn clicked
 */
$(".rename-rule-btn").click((ev) => {
    var idd = ev.target.id;
    if ($("#" + idd)[0].className.includes('disabled')) {
        return;
    }
    var placeholder = $("#" + idd).attr("data-placeholder");
    var insertPosition = $("#rename_rule").getCursorPosition();
    var rule = $("#rename_rule").val();
    var newStr = rule.substring(0, insertPosition) + placeholder + rule.substring(insertPosition);
    settings.setSetting('single_rename_rule', newStr);
    settings.write();
    $("#rename_rule").val(newStr);
});

/**
 * Callback when resetting renaming rule
 */
$("#reset_rename_rule").click((event) => {
    settings.setSetting('single_rename_rule', '%%Artists%% - %%Song%%');
    settings.write();
    $("#rename_rule").val(settings.getSetting('single_rename_rule'));
});

/**
 * Naming type: auto / manual
 * Change the display of naming part
 */
$('#auto_obtain_target_filename').change((event) => {
    if ($('#auto_obtain_target_filename').is(":checked")) {
        $("#target_filename").attr("disabled", "disabled");
        $("#rename_rule").removeAttr("disabled");
        $(".rename-rule-btn").removeClass("disabled");
    } else {
        $("#target_filename").removeAttr("disabled");
        $("#rename_rule").attr("disabled", "disabled");
        $(".rename-rule-btn").addClass("disabled");
    }
});

/**
 * Callback when start_single_process clicked.
 * Start to parse single file
 */
$("#start_single_process").click((e) => {
    var btn = $(e.target);
    var sourceName = $("#cache_file").val();
    if (sourceName === undefined || sourceName === null || sourceName.length === 0) {
        msgbox.errorBox("无效的缓存文件名称");
        return;
    } else {
        var sourceStat = fs.statSync(sourceName);
        if (!sourceStat.isFile()) {
            msgbox.errorBox("缓存文件不是合法的文件");
            return;
        }
    }

    var targetDir = $("#target_dir").val();
    var isTargetDirUsingCache = $("#target_dir_using_cache").is(":checked");
    if (isTargetDirUsingCache) {
        targetDir = sourceName.substring(0, sourceName.lastIndexOf(path.sep) + 1);
    } else if (targetDir === undefined || targetDir === null || targetDir.length === 0) {
        msgbox.errorBox("无效的目标文件路径");
        return;
    }
    var targetDirStat = fs.statSync(targetDir);
    if (!targetDirStat.isDirectory()) {
        msgbox.errorBox("目标文件路径不是合法的路径");
        return;
    }

    var target_filename = "";
    // Auto renamimg
    if ($("#auto_obtain_target_filename").is(":checked")) {
        var rule = $("#rename_rule").val();
        var musicId = 0;
        if (sourceName.includes('-')) {
            var sn = sourceName.substring(sourceName.lastIndexOf(path.sep)+1);
            musicId = parseInt(sn.substring(0, sn.indexOf('-')));
            if (isNaN(musicId)) {
                msgbox.errorBox("无法从缓存文件名中获取音乐ID.");
                return;
            }
            
            target_filename = getMusicNameByRule(musicId, rule, sourceName, targetDir);
            if (target_filename === null) {
                // Auto renaming processing is at callback of ipcRender
                return;
            }
        } else {
            msgbox.errorBox("无法获取音乐ID，将使用原先的名称作为目标音乐名.");
            target_filename = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1, sourceName.lastIndexOf("."));
        }

    } else {
        target_filename = $("#target_filename").val();
    }
    console.log("target_filename=" + target_filename);
    if (target_filename === null || target_filename === undefined || target_filename.length === 0) {
        msgbox.errorBox("目标音乐名为空.");
        return;
    } else if (target_filename.includes(path.sep)) {
        msgbox.errorBox("目标音乐名包含非法字符.");
        return;
    }
    processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + target_filename+".mp3");

})

/**
 * Obtain music name by specific rule
 * @param {String} rule 
 */
function getMusicNameByRule(musicId, rule, sourceName, targetDir, type) {
    if (rule === undefined || rule === null || rule.length === 0) {
        logger.error("命名规则为空", type);
        return '';
    }
    if (!rule.includes('%%')) {
        return rule;
    }
    ipcRenderer.send('get-meta-info', musicId);

    /**
     * Receive music meta info
     */
    ipcRenderer.once('get-meta-info-response-'+musicId, (event, arg) => {
        console.log(arg);
        if (arg === 'net::ERR_INTERNET_DISCONNECTED') {
            logger.error('网络无法连接', type);
        } else if (arg.startsWith('net')) {
            logger.error('网络错误:' + arg, type);
        } else {
            // 获取成功，调用解析器
            parseMusicInfo(arg, rule, sourceName, targetDir, type);
        }

    })

    return null;
}



function parseMusicInfo(response, rule, sourceName, targetDir, type) {
    try {
        var responseObj = JSON.parse(response);
    } catch (e) {
        logger.error('无法解析音乐信息.', type)
        return;
    }
    if (responseObj.code !== 200 || responseObj.songs.length === 0) {
        logger.error('无法获取音乐信息.', type);
        return;
    }
    var info = responseObj['songs'][0];
    var targetFilename = rule;

    // Artists replacement
    var artists = '';
    var i = 0;
    if (info["artists"] !== undefined && info["artists"] !== null && info['artists'].length > 0) {
        for (i=0; i<info['artists'].length; i++) {
            artists += info['artists'][i]['name'] + ",";
        }
        artists = artists.substring(0, artists.length-1);
        targetFilename = replaceAll(targetFilename, '%%Artists%%', artists);
    }
    // Song replacement
    targetFilename = replaceAll(targetFilename, '%%Song%%', (info['name'] !== undefined && info['name'] !== null) ? info['name'] : '');
    // Album replacement
    try {
        targetFilename = replaceAll(targetFilename, '%%Album%%', info['album']['name']);
    } catch (e) {}
    // MusicId replacement
    targetFilename = replaceAll(targetFilename, '%%MusicID%%', info['id']);
    // Alias replacement
    var alias = '';
    if (info['alias'] !== undefined && info['alias'] !== null && info['alias'].length > 0) {
        for (i=0; i<info['alias'].length; i++) {
            alias += info['alias'][i] + ",";
        }
        alias = alias.substring(0, alias.length-1);
        targetFilename = replaceAll(targetFilename, '%%Alias%%', '('+alias+')');
    }
    // Company repalcement
    try {
    targetFilename = replaceAll(targetFilename, '%%Company%%', info['album']['company']);
    } catch (e) {}
    // Track replacement
    targetFilename = replaceAll(targetFilename, '%%Track%%', info['no']);
    // Disc replacement
    targetFilename = replaceAll(targetFilename, '%%Disc%%', info['disc'].includes('/') ? info['disc'].substring(0, info['disc'].indexOf('/')) : info['disc']);

    console.log(targetFilename, 'artists='+artists, 'song='+info['name'], 'album='+info['album']['name'], 'musicId='+info['id'], 'alias='+alias, 
        'company='+info['album']['company'], 'track='+info['no'], 
        'disc='+info['disc'].includes('/') ? info['disc'].substring(0, info['disc'].indexOf('/')) : info['disc']);
    if (type === 'batch') {
        logger.info('获取到的音乐名:'+targetFilename+"("+getFilenameFromFullPath(sourceName)+")", type);
    }

    processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + targetFilename+".mp3", type);
}

function replaceAll(str, before, after) {
    if (str === undefined || str === null || before === after) {
        return str;
    }
    while (str.includes(before)) {
        str = str.replace(before, after);
    }
    return str;
}



/**
 * Parse single cache file.
 * This function can be reused on batch processing
 * @param {String} filename 
 */
function processSingleFile(sourceName, destinationName, type) {
    var data;
    try {
        data = fs.readFileSync(sourceName);
    } catch (e) {
        logger.error("读取音乐缓存文件出错:"+e.message, type);
        return;
    }
    for (var i = 0; i < data.length; i++) {
        data[i] = data[i] ^ 0xA3;
    }
    try {
        fs.writeFileSync(destinationName, data);
    } catch (e) {
        logger.error("写入音乐文件出错:" + e.message, type);
        return;
    }
    logger.primary('音乐转换完成.('+getFilenameFromFullPath(sourceName)+" --> "+getFilenameFromFullPath(destinationName)+")", type);
}

function getFilenameFromFullPath(ppath) {
    if (ppath === undefined || ppath === null || ppath.length === 0)
        return ppath;
    else
        return ppath.substring(ppath.lastIndexOf(path.sep)+1);
}


