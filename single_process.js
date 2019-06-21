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
        message: '选择一个音乐缓存文件'
    }, (files) => {
        if (files === undefined || files === null || files.length === 0) {
            $("#cache_file").val("");
        } else {
            $("#cache_file").val(files[0]);
        }
    });

});

/**
 * Processor which get the selected file list from open dialog
 * @param {Object} options options for open dialog
 * @param {Function} callback do something when file list is back
 */
function getSelectedFileByDialog(options, callback) {
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
    var placeholder = $("#"+idd).attr("data-placeholder");
    var insertPosition = $("#rename_rule").getCursorPosition();
    var rule = $("#rename_rule").val();
    var newStr = rule.substring(0, insertPosition) + placeholder + rule.substring(insertPosition);
    $("#rename_rule").val(newStr);
});

/**
 * Callback when resetting renaming rule
 */
$("#reset_rename_rule").click((event) => {
    settings.setSetting('single_rename_rule', '%%Singer%% - %%Song%%');
    settings.write();
    $("#rename_rule").val(settings.getSetting('single_rename_rule'));
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
    var targetStat = fs.statSync(targetDir);
    if (!sourceStat.isDirectory()) {
        msgbox.errorBox("目标文件路径不是合法的路径");
        return;
    }
})

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

ipcRenderer.on('get-meta-info-response', (event, arg) => {
    console.log(JSON.parse(arg));
})
/**
 * Parse single cache file.
 * This function can be reused on batch processing
 * @param {String} filename 
 */
function processSingleFile(sourceName, destinationName) {
    var data;
    try {
        data = fs.readFileSync(sourceName);
    } catch (e) {
        msgbox.errorBox("读取音乐缓存文件出错:" + e.message);
    }
    for (var i = 0; i < data.length; i++) {
        data[i] = data[i] ^ 0xA3;
    }
    try {
        fs.writeFileSync(destinationName, data);
    } catch (e) {
        msgbox.errorBox("写入音乐文件出错:" + e.message);
    }

}

/**
 * Obtain music name by specific rule
 * @param {String} sourceName 
 * @param {String} rule 
 */
function getMusicNameByRule(sourceName, rule) {

}

