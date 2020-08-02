var table = null;

function getFilesInDir(jsonPath) {
    let jsonFiles = [];
    function findJsonFile(dir) {
        let files = fs.readdirSync(dir);
        files.forEach(function (item, index) {
            let fPath = path.join(dir, item);
            let stat = fs.statSync(fPath);
            // if(stat.isDirectory() === true) {
            //     findJsonFile(fPath);
            // }
            if (stat.isFile() === true) {
                jsonFiles.push(fPath);
            }
        });
    }
    findJsonFile(jsonPath);
    console.log(jsonFiles);
    return jsonFiles;
}

/**
 * Initialize when page is loaded
 */
$(document).ready((event) => {
    $("#brename_rule").val(settings.getSetting('single_rename_rule'));
    if (process.platform === 'darwin') {
        $('#bdefault_cache_dir_wrapper').css('display', 'block');
    } else {
        $('#bdefault_cache_dir_wrapper').css('display', 'none');
    }
});

/**
 * Callback when select source file
 */
$("#bcache_dir_selection_btn").click((e) => {
    getSelectedFileByDialog({
        properties: ['openDirectory'],
        filters: [
            { name: langUtil.getTranslation('Hint_CacheFileFilter'), extensions: ['uc', 'uc!'] }
        ],
        title: title,
        message: langUtil.getTranslation('Hint_SelectCacheDirectory'),
        defaultPath: $("#bdefault_cache_dir").is(":checked") ? replaceAll(settings.getSetting('macOS_default_cache_dir'), '%%Username%%', os.userInfo().username) : ''
    }, (files) => {
        if (files === undefined || files === null || files.length === 0) {
            $("#bcache_dir").val("");
        } else {
            $("#bcache_dir").val(files[0]);
        }
    });
});

/**
 * Callback when target_dir selection button clicked
 * Open dialog for target directory selection
 */
$("#btarget_dir_selection_btn").click((e) => {
    if (!($("#btarget_dir_using_cache").is(":checked"))) {
        getSelectedFileByDialog({
            properties: ['openDirectory'],
            title: title,
            message: langUtil.getTranslation('Hint_SelectTargetDirectory')
        }, (dirs) => {
            if (dirs === undefined || dirs === null || dirs.length === 0) {
                $("#btarget_dir").val("");
            } else {
                $("#btarget_dir").val(dirs[0]);
            }
        });
    }
});

/**
 * Callback on auto-renaming, re-enable/disable some feature
 */
$("#btarget_dir_using_cache").change((e) => {
    if ($("#btarget_dir_using_cache").is(":checked")) {
        $("#btarget_dir").attr("disabled", "disabled");
        $("#btarget_dir_selection_btn").addClass("disabled");
    } else {
        $("#btarget_dir").removeAttr("disabled");
        $("#btarget_dir_selection_btn").removeClass("disabled");
    }
});

/**
 * Modify renaming rule when rule-btn clicked
 */
$(".brename-rule-btn").click((ev) => {
    var idd = ev.target.id;
    if ($("#" + idd)[0].className.includes('disabled')) {
        return;
    }
    var placeholder = $("#" + idd).attr("data-placeholder");
    var insertPosition = $("#brename_rule").getCursorPosition();
    var rule = $("#brename_rule").val();
    var newStr = rule.substring(0, insertPosition) + placeholder + rule.substring(insertPosition);
    settings.setSetting('single_rename_rule', newStr);
    settings.write();
    $("#brename_rule").val(newStr);
});

/**
 * Callback when resetting renaming rule
 */
$("#breset_rename_rule").click((event) => {
    settings.setSetting('single_rename_rule', '%%Artists%% - %%Song%%');
    settings.write();
    $("#brename_rule").val(settings.getSetting('single_rename_rule'));
});

/**
 * Naming type: auto / manual
 * Change the display of naming part
 */
$('input[type=radio][name=target_filename]').change((event) => {
    if ($('#bauto_obtain_target_filename').is(":checked")) {
        $("#brename_rule").removeAttr("disabled");
        $(".brename-rule-btn").removeClass("disabled");
    } else {
        $("#brename_rule").attr("disabled", "disabled");
        $(".brename-rule-btn").addClass("disabled");
    }
});

/**
 * Callback when bstart_batch_process clicked.
 * Start to parse single file
 */
var tableLanguage = {
    "zh_cn": {
        processing:     "处理中...",
        search:         "搜索:",
        lengthMenu:    "显示 _MENU_ 项结果",
        info:           "显示第 _START_ 至 _END_ 项结果，共 _TOTAL_ 项",
        infoEmpty:      "显示第 0 至 0 项结果，共 0 项",
        infoFiltered:   "(由 _MAX_ 项结果过滤)",
        infoPostFix:    "",
        loadingRecords: "载入中...",
        zeroRecords:    "没有匹配结果",
        emptyTable:     "表中数据为空",
        paginate: {
            first:      "首页",
            previous:   "上页",
            next:       "下页",
            last:       "末页"
        },
        aria: {
            sortAscending:  ": 以升序排列此列",
            sortDescending: ": 以降序排列此列"
        }
    },
    "en": {
        processing:     "Processing...",
        search:         "Search:",
        lengthMenu:    "Show _MENU_ entries",
        info:           "Showing _START_ to _END_ of _TOTAL_ entries",
        infoEmpty:      "Showing 0 to 0 of 0 entries",
        infoFiltered:   "(filtered from _MAX_ total entries)",
        infoPostFix:    "",
        loadingRecords: "Loading...",
        zeroRecords:    "Show _MENU_ entries",
        emptyTable:     "No matching records found",
        paginate: {
            first:      "First",
            previous:   "Previous",
            next:       "Next",
            last:       "Last"
        },
        aria: {
            sortAscending:  ": activate to sort column ascending",
            sortDescending: ": activate to sort column descending"
        }
    }
}
$("#bstart_batch_process").click((e) => {
    var btn = $(e.target);
    var sourceDir = $("#bcache_dir").val();
    if (sourceDir === undefined || sourceDir === null || sourceDir.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidFileName'));
        return;
    } else {
        var sourceStat = fs.statSync(sourceDir);
        if (!sourceStat.isDirectory()) {
            msgbox.errorBox(langUtil.getTranslation('Hint_InvalidCacheDirectory'));
            return;
        }
    }

    var targetDir = $("#btarget_dir").val();
    var isTargetDirUsingCache = $("#btarget_dir_using_cache").is(":checked");
    if (isTargetDirUsingCache) {
        targetDir = sourceDir;
    } else if (targetDir === undefined || targetDir === null || targetDir.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidTargetDirectory'));
        return;
    }
    var targetDirStat = fs.statSync(targetDir);
    if (!targetDirStat.isDirectory()) {
        msgbox.errorBox(langUtil.getTranslation('Code_InvalidTargetDirectory'));
        return;
    }

    sourceNameList = getFilesInDir(sourceDir);

    for (var i = 0; i < sourceNameList.length; i++) {
        console.log("sourceName=" + sourceNameList[i]);
        var sourceName = sourceNameList[i];
        if (!sourceName.endsWith('uc') && !sourceName.endsWith('uc!')) {
            continue;
        }

        var target_filename = "";
        // Auto renamimg
        if ($("#bauto_obtain_target_filename").is(":checked")) {
            var rule = $("#brename_rule").val();
            var musicId = 0;
            var re = /\d+/;

            if (sourceName.includes('-') || re.test(getFilenameFromFullPath(sourceName))) {
                var sn = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1);
                musicId = parseInt(sn.substring(0, sn.indexOf('-') === -1 ? sn.length : sn.indexOf('-')));
                if (isNaN(musicId)) {
                    logger.error(langUtil.getTranslation('Code_FailedToGetMusicId'), 'batch');
                    continue;
                }

                target_filename = getMusicNameByRule(musicId, rule, sourceName, targetDir, 'batch');
                if (target_filename === null) {
                    // Auto renaming processing is at callback of ipcRender
                    continue;
                }
            } else {
                logger.error(langUtil.getTranslation('Code_FailedToGetMusicIdUsingOriginalName'), 'batch');
                target_filename = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1, sourceName.lastIndexOf("."));
            }

        } else {
            target_filename = getFilenameFromFullPath(sourceName);
            target_filename = target_filename.substring(0, target_filename.indexOf('.'))
        }
        console.log("target_filename=" + target_filename);
        if (target_filename === null || target_filename === undefined || target_filename.length === 0) {
            logger.error(langUtil.getTranslation('Code_EmptyTargetMusicName'), 'batch');
            continue;
        } else if (target_filename.includes(path.sep)) {
            logger.error(langUtil.getTranslation('Code_InvalidSymbolFound'), 'batch');
            continue;
        }
        processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + target_filename + ".mp3", 'batch');
    }

})

$('#bcheck_batch').click(async function (ev) {
    // 找出来batch下的全部缓存文件
    var sourceDir = $("#bcache_dir").val();
    if (sourceDir === undefined || sourceDir === null || sourceDir.length === 0) {
        msgbox.errorBox(langUtil.getTranslation('Hint_InvalidCacheDirectory'));
        return;
    } else {
        var sourceStat = fs.statSync(sourceDir);
        if (!sourceStat.isDirectory()) {
            msgbox.errorBox(langUtil.getTranslation('Hint_InvalidCacheDirectory'));
            return;
        }
    }

    $('#text_scaning').show();
    sourceNameList = getFilesInDir(sourceDir);
    let sourceObject = [];

    for (let i = 0; i < sourceNameList.length; i++) {
        console.log("sourceName=" + sourceNameList[i]);
        var sourceName = sourceNameList[i];
        if (!sourceName.endsWith('uc') && !sourceName.endsWith('uc!')) {
            continue;
        }

        var musicId = 0;
        var re = /\d+/;
        let obj = {};

        obj['filename'] = sourceName;
        obj['filenameD'] = getFilenameFromFullPath(sourceName);
        obj['artist'] = 'N/A';
        obj['album'] = 'N/A';
        obj['title'] = 'N/A';

        if (sourceName.includes('-') || re.test(getFilenameFromFullPath(sourceName))) {
            var sn = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1);
            musicId = parseInt(sn.substring(0, sn.indexOf('-') === -1 ? sn.length : sn.indexOf('-')));

            if (isNaN(musicId)) {
                obj['musicId'] = 'N/A';
                continue;
            }

            obj['musicId'] = musicId;
        } else {
            obj['musicId'] = 'N/A';
        }
        sourceObject.push(obj)
    }

    for (let i = 0; i < sourceObject.length; i++) {
        if (sourceObject[i]['musicId'] !== 'N/A') {
            console.log(sourceObject[i]['musicId']);
            ipcRenderer.send('get-meta-info', sourceObject[i]['musicId']);

            /**
             * Receive music meta info
             */
            ipcRenderer.once('get-meta-info-response-' + sourceObject[i]['musicId'], (event, arg) => {
                // console.log(sourceObject[i]['musicId'], arg);
                sourceObject[i]['status'] = 'OBTAINED';
                if (arg === 'net::ERR_INTERNET_DISCONNECTED') {
                    return;
                } else if (arg.startsWith('net')) {
                    return;
                } else {
                    try {
                        var responseObj = JSON.parse(arg);
                    } catch (e) {
                        console.error(e);
                        return;
                    }
                    if (responseObj.code !== 200 || responseObj.songs.length === 0) {
                        console.error(responseObj.code, responseObj.songs.length)
                        return;
                    }
                    var info = responseObj['songs'][0];
                    console.log(info);

                    // Artists replacement
                    var artists = '';
                    let j = 0;
                    if (info["artists"] !== undefined && info["artists"] !== null && info['artists'].length > 0) {
                        for (j = 0; j < info['artists'].length; j++) {
                            artists += info['artists'][j]['name'] + ",";
                        }
                        artists = artists.substring(0, artists.length - 1);
                        sourceObject[i]['artist'] = artists;
                    }
                    //Song
                    sourceObject[i]['title'] = info['name'];
                    // Album replacement
                    sourceObject[i]['album'] = info['album']['name'];
                    sourceObject[i]['status'] = 'SET';
                }

            });
        } else {
            sourceObject[i]['status'] = 'INVALID';
        }
    }

    let lock = true;
    let timer = setTimeout(function () {
        lock = false;
    }, 30000);

    while (lock) {
        let flag = true;
        for (let i = 0; i < sourceObject.length; i++) {
            if (sourceObject[i]['status'] === undefined || sourceObject[i]['status'] === null) {
                flag = false;
                break;
            }
        }
        if (flag) {
            break;
        } else {
            await sleep(500);
        }
    }

    clearTimeout(timer);

    console.log(sourceObject);

    if (!lock) {
        msgbox.errorBox('Wrong status');
        $('#text_scaning').hide();
        return;
    }

    let operationHtml = '<button class="btn btn-link single-convert-btn" data-index="%d" data-lang="Table_ConvertIt" type="button">转换此文件</button>';
    for (let i = 0; i < sourceObject.length; i++) {
        sourceObject[i]['no'] = i+1;
        sourceObject[i]['operation'] = operationHtml.replace('%d', '' + i);
    }

    // If table exists, destroy it first
    if (table !== undefined && table !== null) {
        table.destroy();
        table = null;
        $('#table_wrapper').html($('#table_template').val());
    }

    $('#table_wrapper').show();

    table = $('#scan_table').on('draw.dt', tableCallBack)
        .on('init.dt', tableCallBack)
        .DataTable({
            data: sourceObject,
            columns: [
                { data: 'no' },
                { data: 'filenameD' },
                { data: 'artist' },
                { data: 'title' },
                { data: 'operation', "orderable": false }
            ],
            language: tableLanguage[langUtil.getCurLang()]
        });
    $('#text_scaning').hide();
});

function tableCallBack() {
    $('.single-convert-btn').unbind('click').click((ev) => {
        let index = parseInt($(ev.target).attr('data-index'));
        if (table !== undefined && table !== null) {
            let data = table.data();
            console.log(index, data[index]);
            startBatchOneProcess(data[index].filename);
        }
    });
    langUtil.refreshpage();
}

/**
 * 
 * @param {String} sourceName filename to be converted
 */
function startBatchOneProcess(sourceName) {
    var targetDir = $("#btarget_dir").val();
    var isTargetDirUsingCache = $("#btarget_dir_using_cache").is(":checked");
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}