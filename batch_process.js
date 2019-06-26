
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
            { name: '网易云音乐缓存', extensions: ['uc', 'uc!'] }
        ],
        title: title,
        message: '选择一个音乐缓存目录',
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
            message: '选择目标路径'
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
$("#bstart_batch_process").click((e) => {
    var btn = $(e.target);
    var sourceDir = $("#bcache_dir").val();
    if (sourceDir === undefined || sourceDir === null || sourceDir.length === 0) {
        msgbox.errorBox("无效的缓存文件名称");
        return;
    } else {
        var sourceStat = fs.statSync(sourceDir);
        if (!sourceStat.isDirectory()) {
            msgbox.errorBox("缓存文件路径不是合法的路径");
            return;
        }
    }

    var targetDir = $("#btarget_dir").val();
    var isTargetDirUsingCache = $("#btarget_dir_using_cache").is(":checked");
    if (isTargetDirUsingCache) {
        targetDir = sourceDir;
    } else if (targetDir === undefined || targetDir === null || targetDir.length === 0) {
        msgbox.errorBox("无效的目标文件路径");
        return;
    }
    var targetDirStat = fs.statSync(targetDir);
    if (!targetDirStat.isDirectory()) {
        msgbox.errorBox("目标文件路径不是合法的路径");
        return;
    }

    sourceNameList = getFilesInDir(sourceDir);

    for (var i = 0; i < sourceNameList.length; i++) {
        console.log("sourceName=" + sourceNameList[i]);
        var sourceName = sourceNameList[i];

        var target_filename = "";
        // Auto renamimg
        if ($("#bauto_obtain_target_filename").is(":checked")) {
            var rule = $("#brename_rule").val();
            var musicId = 0;
            var re = /\d+/;

            if (sourceName.includes('-') || re.test(getFilenameFromFullPath(sourceName))) {
                var sn = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1);
                musicId = parseInt(sn.substring(0, sn.indexOf('-')===-1?sn.length:sn.indexOf('-')));
                if (isNaN(musicId)) {
                    logger.error("无法从缓存文件名中获取音乐ID.", 'batch');
                    continue;
                }

                target_filename = getMusicNameByRule(musicId, rule, sourceName, targetDir, 'batch');
                if (target_filename === null) {
                    // Auto renaming processing is at callback of ipcRender
                    continue;
                }
            } else {
                logger.error("无法获取音乐ID，将使用原先的名称作为目标音乐名.", 'batch');
                target_filename = sourceName.substring(sourceName.lastIndexOf(path.sep) + 1, sourceName.lastIndexOf("."));
            }

        } else {
            target_filename = getFilenameFromFullPath(sourceName);
            target_filename = target_filename.substring(0, target_filename.indexOf('.'))
        }
        console.log("target_filename=" + target_filename);
        if (target_filename === null || target_filename === undefined || target_filename.length === 0) {
            logger.error("目标音乐名为空.", 'batch');
            continue;
        } else if (target_filename.includes(path.sep)) {
            logger.error("目标音乐名包含非法字符.", 'batch');
            continue;
        }
        processSingleFile(sourceName, targetDir + (targetDir.endsWith(path.sep) ? '' : path.sep) + target_filename + ".mp3", 'batch');

    }

})




