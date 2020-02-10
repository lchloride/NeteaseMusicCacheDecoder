const NodeID3 = nodeRequire('node-id3');
var NodeAES = nodeRequire('aes-js');
var pkcs7 = nodeRequire('pkcs7');
const getMP3Duration = nodeRequire('get-mp3-duration');
const uuidv4 = nodeRequire('uuid/v4');

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
            { name: langUtil.getTranslation('Hint_CacheFileFilter'), extensions: ['uc', 'uc!'] }
        ],
        title: title,
        message: langUtil.getTranslation('Hint_SelectCacheFile'),
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
            message: langUtil.getTranslation('Hint_SelectTargetDirectory')
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
$("#start_single_process").click(startSingleProcess);

/**
 * Callback when start_single_process clicked OR part of batch is clicked
 * @param {Event} e click event
 * @param {String} sourceName source name, if assigned, this will be used instand of input
 */
function startSingleProcess(e, sourceName)
{
    var targetDir = $("#target_dir").val();
    var isTargetDirUsingCache = $("#btarget_dir_using_cache").is(":checked");
    if (sourceName === undefined) {
        sourceName = $("#cache_file").val();
        isTargetDirUsingCache = $("#target_dir_using_cache").is(":checked");
    }
    if (sourceName === undefined || sourceName === null || sourceName.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidFileName'));
        return;
    } else {
        var sourceStat = fs.statSync(sourceName);
        if (!sourceStat.isFile()) {
            msgbox.errorBox(langUtil.getTranslation('Code_InvalidFileFormat'));
            return;
        }
    }

    if (isTargetDirUsingCache) {
        targetDir = sourceName.substring(0, sourceName.lastIndexOf(path.sep) + 1);
    } else if (targetDir === undefined || targetDir === null || targetDir.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidTargetDirectory'));
        return;
    }
    var targetDirStat = fs.statSync(targetDir);
    if (!targetDirStat.isDirectory()) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidTargetDirectory'));
        return;
    }

    var target_filename = "";
    // Auto renamimg
    if ($("#auto_obtain_target_filename").is(":checked")) {
        var rule = $("#rename_rule").val();
        var musicId = 0;
        var re = /\d+/;
        if (sourceName.includes('-') || re.test(getFilenameFromFullPath(sourceName))) {
            var sn = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1);
            musicId = parseInt(sn.substring(0, sn.indexOf('-') === -1 ? sn.length : sn.indexOf('-')));
            if (isNaN(musicId)) {
                msgbox.errorBox(langUtil.getTranslation('Code_MusicIDNotFound'));
                return;
            }

            target_filename = getMusicNameByRule(musicId, rule, sourceName, targetDir);
            if (target_filename === null) {
                // Auto renaming processing is at callback of ipcRender
                return;
            }
        } else {
            msgbox.errorBox(langUtil.getTranslation('Code_MusicIDNotFoundOriginalNameUsed'));
            target_filename = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1, sourceName.lastIndexOf("."));
        }

    } else {
        target_filename = $("#target_filename").val();
    }
    console.log("target_filename=" + target_filename);
    if (target_filename === null || target_filename === undefined || target_filename.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Code_EmptyTargetMusicName'));
        return;
    } else if (target_filename.includes(path.sep)) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidSymbolFound'));
        return;
    }
    processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + target_filename + ".mp3");

}

/**
 * Obtain music name by specific rule
 * @param {String} rule 
 */
function getMusicNameByRule(musicId, rule, sourceName, targetDir, type) {
    if (rule === undefined || rule === null || rule.length === 0) {
        logger.error(langUtil.getTranslation('Code_NamingRuleNotAssigned'), type);
        return '';
    }
    if (!rule.includes('%%')) {
        return rule;
    }
    ipcRenderer.send('get-meta-info', musicId);

    /**
     * Receive music meta info
     */
    ipcRenderer.once('get-meta-info-response-' + musicId, (event, arg) => {
        console.log(arg);
        if (arg === 'net::ERR_INTERNET_DISCONNECTED') {
            logger.error(langUtil.getTranslation('Code_NetworkUnavailable'), type);
        } else if (arg.startsWith('net')) {
            logger.error(langUtil.getTranslation('Code_NetworkErrorPrefix') + arg, type);
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
        logger.error(langUtil.getTranslation('Code_ParseMusicInfoError'), type)
        return;
    }
    if (responseObj.code !== 200 || responseObj.songs.length === 0) {
        logger.error(langUtil.getTranslation('Code_GetMusicInfoFailure'), type);
        return;
    }
    var info = responseObj['songs'][0];
    var targetFilename = rule;
    console.log(info);

    // Artists replacement
    var artists = '';
    var i = 0;
    if (info["artists"] !== undefined && info["artists"] !== null && info['artists'].length > 0) {
        for (i = 0; i < info['artists'].length; i++) {
            artists += info['artists'][i]['name'] + ",";
        }
        artists = artists.substring(0, artists.length - 1);
        targetFilename = replaceAll(targetFilename, '%%Artists%%', artists);
    } else {
        targetFilename = replaceAll(targetFilename, '%%Artists%%', '');
    }
    // Song replacement
    targetFilename = replaceAll(targetFilename, '%%Song%%', (info['name'] !== undefined && info['name'] !== null) ? info['name'] : '');
    // Album replacement
    try {
        targetFilename = replaceAll(targetFilename, '%%Album%%', info['album']['name']);
    } catch (e) { }
    // MusicId replacement
    targetFilename = replaceAll(targetFilename, '%%MusicID%%', info['id']);
    // Alias replacement
    var alias = '';
    if (info['alias'] !== undefined && info['alias'] !== null && info['alias'].length > 0) {
        for (i = 0; i < info['alias'].length; i++) {
            alias += info['alias'][i] + ",";
        }
        alias = alias.substring(0, alias.length - 1);
        targetFilename = replaceAll(targetFilename, '%%Alias%%', '(' + alias + ')');
    } else {
        targetFilename = replaceAll(targetFilename, '%%Alias%%', '');
    }
    // Company repalcement
    try {
        targetFilename = replaceAll(targetFilename, '%%Company%%', info['album']['company']);
    } catch (e) { }
    // Track replacement
    targetFilename = replaceAll(targetFilename, '%%Track%%', info['no']);
    // Disc replacement
    targetFilename = replaceAll(targetFilename, '%%Disc%%', info['disc'].includes('/') ? info['disc'].substring(0, info['disc'].indexOf('/')) : info['disc']);
    // Solve the issue that the filename containing slash
    targetFilename = targetFilename.replace(/\//g, '\uff0f');

    console.log(targetFilename, 'artists=' + artists, 'song=' + info['name'], 'album=' + info['album']['name'], 'musicId=' + info['id'], 'alias=' + alias,
        'company=' + info['album']['company'], 'track=' + info['no'],
        'disc=' + info['disc'].includes('/') ? info['disc'].substring(0, info['disc'].indexOf('/')) : info['disc']);
    if (type === 'batch') {
        logger.info(langUtil.getTranslation('Code_MusicNameParsed') + targetFilename + "(" + getFilenameFromFullPath(sourceName) + ")", type);
    }

    processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + targetFilename + ".mp3", type);

    writeNewMp3Tags(targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + targetFilename + ".mp3", info, type);
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
        logger.error(langUtil.getTranslation('Code_ReadMusicCacheFailure') + e.message, type);
        return;
    }
    for (var i = 0; i < data.length; i++) {
        data[i] = data[i] ^ 0xA3;
    }
    try {
        fs.writeFileSync(destinationName, data);
    } catch (e) {
        logger.error(langUtil.getTranslation('Code_WriteMusicCacheFailure') + e.message, type);
        return;
    }
    logger.primary(langUtil.getTranslation('Code_DecodeFinished') + '(' + getFilenameFromFullPath(sourceName) + " --> " + getFilenameFromFullPath(destinationName) + ")", type);
}

/**
 * Parse music information and write music tags to music
 * @param {String} destinationName target filename
 * @param {Object} info music information object
 * @param {String} type Single or Batch
 */
function writeNewMp3Tags(destinationName, info, type) {
    if (!(info instanceof Object)) {
        return;
    }
    let tags = {};
    // Artist(s), use "/" to seperate with each other
    if (info['artists'] !== undefined && info['artists'] !== null) {
        let artists = '';
        for (a in info['artists']) {
            artists += info['artists'][a]['name'] + '/';
        }
        if (artists.length > 0) {
            artists = artists.substring(0, artists.length-1);
        }
        tags['artist'] = artists;
    }
    // Album
    if (info['album'] !== undefined && info['album'] !== null &&
        info['album']['name'] !== undefined && info['album']['name'] !== null) {
        tags['album'] = info['album']['name'];
    }
    // TrackNumber
    if (info['no'] !== undefined && info['no'] !== null) {
        tags['trackNumber'] = '' + info['no'];
    }
    // Title
    if (info['name'] !== undefined && info['name'] !== null) {
        tags['title'] = info['name'];
    }
    // copyright
    if (info['album'] !== undefined && info['album'] !== null && 
        info['album']['company'] !== undefined && info['album']['company'] !== null) {
        tags['copyright'] = info['album']['company'];
    }
    // Comments
    let meta = {};
    meta['album'] = info['album']['name'];
    meta['albumId'] = info['album']['id'];
    meta['albumPic'] = info['album']['picUrl'].replace('http://', 'https://');
    if ('pic' in info['album']) {
        meta['albumPicDocId'] = info['album']['pic'];
    } else {
        meta['albumPicDocId'] = /\/(\d+)\.\w+$/g.exec(info['album']['picUrl'])[1]
    }
    if ('alias' in info) {
        meta['alias'] = info['alias'];
    } else {
        meta['alias'] = [];
    }
    meta['artist'] = []
    for (a in info['artists']) {
        meta['artist'].push([info['artists'][a]['name'], info['artists'][a]['id']]);
    }
    meta['musicId'] = info['id'];
    meta['musicName'] = info['name'];
    if ('mvId' in info) {
        meta['mvId'] = info['mvId'];
    } else {
        meta['mvId'] = 0;
    }
    meta['transNames'] = [];
    meta['format'] = 'mp3';

    if ('hMusic' in info && 'mMusic' in info && 'lMusic' in info && 'bMusic' in info) {
        let stats = fs.statSync(destinationName);
        let hMusicSizeDiff = Math.abs(info['hMusic']['size'] - stats.size);
        let mMusicSizeDiff = Math.abs(info['mMusic']['size'] - stats.size);
        let lMusicSizeDiff = Math.abs(info['lMusic']['size'] - stats.size);
        let bMusicSizeDiff = Math.abs(info['bMusic']['size'] - stats.size);
        let sizeDiffMin = Math.min(hMusicSizeDiff, mMusicSizeDiff, lMusicSizeDiff, bMusicSizeDiff);
        if (sizeDiffMin == hMusicSizeDiff) {
            meta['bitrate'] = info['hMusic']['bitrate'];
        } else if (sizeDiffMin == mMusicSizeDiff) {
            meta['bitrate'] = info['mMusic']['bitrate'];
        } else if (sizeDiffMin == lMusicSizeDiff) {
            meta['bitrate'] = info['lMusic']['bitrate'];
        } else {
            meta['bitrate'] = info['bMusic']['bitrate'];
        }
    }

    let music = fs.readFileSync(destinationName);
    const duration = getMP3Duration(music);

    meta['duration'] = duration;// Math.floor(duration-26);
    meta['mp3DocId'] = crypto.createHash('md5').update(music).digest('hex');

    let key = Buffer.from('2331346C6A6B5F215C5D2630553C2728', 'hex');
    // let text = 'music:{"album": "Resident Evil: Retribution", "albumId": 2554307, "albumPic": "https://p2.music.126.net/AbuUyyxsMr3Xe1LAW6VtJw==/5518448859903100.jpg", "albumPicDocId": 5518448859903100, "alias": [], "artist": [["Tomandandy", 102831]], "musicId": 26758602, "musicName": "Flying Through the Air", "mvId": 0, "transNames": [], "format": "mp3", "bitrate": 128000, "duration": 228336, "mp3DocId": "d986d29068bfe0a46869e5887865df28"}';
    let text = 'music:' + JSON.stringify(meta);//.replace(/":/g, '": ').replace(/",/g, '", ').replace(/,"/g, ', "');
    console.log(text);
    let textBytes = NodeAES.utils.utf8.toBytes(text);
    let textBytesPad = pkcs7.pad(textBytes);
    let aesEcb = new NodeAES.ModeOfOperation.ecb(key);
    let identification = '163 key(Don\'t modify):' + Buffer.from(aesEcb.encrypt(textBytesPad)).toString('base64');

    console.log(identification);

    tags['comment'] = {};
    tags['comment']['language'] = 'XXX';
    tags['comment']['text'] = identification;

    // Cover
    if (info['album'] !== undefined && info['album'] !== null) {
        if (info['album']['picUrl'] !== undefined && info['album']['picUrl'] !== null) {
            let uuid = uuidv4();
            ipcRenderer.send('get-latest-version-file', { url: info['album']['picUrl'], uuid: uuid });
            ipcRenderer.once('get-latest-version-file-response'+uuid, (event, body) => {
                if (body === 'net::ERR_INTERNET_DISCONNECTED') {
                    logger.error(langUtil.getTranslation('Code_CoverImageError') + ' - ' + langUtil.getTranslation('Code_NetworkUnavailable'), type);
                } else if (body === 'net::ERR_CONNECTION_REFUSED') {
                    logger.error(langUtil.getTranslation('Code_CoverImageError') + ' - ' + langUtil.getTranslation('Code_ConnectionRefused'), type);
                } else if (body instanceof String && body.startsWith('net::')) {
                    logger.error(langUtil.getTranslation('Code_CoverImageError') + ' - ' + body, type);
                } else {
                    console.log('Downloaded cover image size = ' + body.length);
                    tags['image'] = {};
                    if (body.slice(0, 4).equals(Buffer.from('89504E47'))) {
                        tags['image']['mine'] = 'image/png';
                    } else {
                        tags['image']['mine'] = 'image/jpg';
                    }
                    tags['image']['imageBuffer'] = body;
                    tags['image']['type'] = { id: 3, name: "front cover" };
                }

                // Write to mp3
                if (NodeID3.update(tags, destinationName)) {
                    logger.primary(langUtil.getTranslation('Code_MetaDataWritten')+': '+destinationName, type);
                } else {
                    logger.error(langUtil.getTranslation('Code_MetaDataWrittenError')+': '+destinationName, type);
                }
            });
        }
    }

}

function getFilenameFromFullPath(ppath) {
    if (ppath === undefined || ppath === null || ppath.length === 0)
        return ppath;
    else
        return ppath.substring(ppath.lastIndexOf(path.sep) + 1);
}


