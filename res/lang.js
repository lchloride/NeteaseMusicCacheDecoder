const { app } = window.nodeRequire('electron').remote;
var langUtil = {
    langObj: {
        "zh_cn": {
            "Error_LanguageResourceNotFound": "无法读取语言资源包,将使用简体中文.",
            "Error_InvalidLanguageResource": "无法解析语言资源包,将使用简体中文.",
        },
        "en": {
            "Error_LanguageResourceNotFound": "Failed to load language resource, Chinese Simplified will be used.",
            "Error_InvalidLanguageResource": "Failed to parse language resource, Chinese Simplified will be used.",
        }
    },
    isLoaded: false,
    init: function () {
        let langJson = fs.readFileSync(app.getAppPath() + path.sep + "language.json");
        try {
            var langObj = this.langObj = JSON.parse(langJson);
        } catch (e) {
            msgbox.errorBox(langUtil.getTranslation("Error_LanguageResourceNotFound"));
            this.isLoaded = false;
            return;
        }
        if (langObj === null || langObj === undefined || !(langObj instanceof Object)) {
            msgbox.errorBox(langUtil.getTranslation("Error_InvalidLanguageResource"));
            this.isLoaded = false;
            return;
        }
        this.refreshpage();
    },
    getCurLang: function () {
        var langObj = this.langObj;
        let lang = settings.getSetting("lang");

        if (lang === undefined || lang === null || langObj[lang] === null || langObj[lang] === undefined) {
            lang = "zh_cn";
        }
        return lang;
    },
    getTranslation: function (key, lang) {
        var langObj = this.langObj;
        if (lang === undefined || lang === null) {
            lang = settings.getSetting("lang");
        }
        if (lang === undefined || lang === null || langObj[lang] === null || langObj[lang] === undefined) {
            lang = "zh_cn";
        }
        let translation = langObj[lang][key];
        if (translation === undefined || translation === null) {
            translation = "";
        }
        return translation;
    },
    refreshpage: function () {
        var langObj = this.langObj;
        $.each($("[data-lang]"), function (index, value) {
            let langSetting = value.dataset.lang;
            let attr = null;
            let key = '';
            if (langSetting.indexOf(':') >= 0) {
                attr = langSetting.substring(0, langSetting.indexOf(':'));
                key = langSetting.substring(langSetting.indexOf(':') + 1);
            } else {
                key = langSetting;
            }
            let lang = settings.getSetting("lang");
            if (lang === undefined || lang === null || langObj[lang] === null || langObj[lang] === undefined) {
                lang = "zh_cn";
            }
            $("#lang_selector").val(lang);
            let translation = langObj[lang][key];
            if (translation === undefined || translation === null) {
                translation = "";
            }
            // Replace all existence of data-lang tag
            if (attr !== null) {
                $(this).attr(attr, translation);
            } else if (this.tagName in ['INPUT', 'input', 'TEXTAREA', 'textarea']) {
                $(this).attr('value', translation);
            } else {
                $(this).html(translation);
            }
        });
    }
};

$(function () {
    langUtil.init();
    $('#lang_selector').change((ev) => {
        let lang = $(ev.target).val();
        settings.setSetting('lang', lang);
        settings.write();
        if (table !== undefined && table !== null) {
            let data = table.context[0].oInit.data;
            table.destroy();
            table = null;
            $('#table_wrapper').html($('#table_template').val());
            table = $('#scan_table').on('draw.dt', tableCallBack)
                .on('init.dt', tableCallBack)
                .DataTable({
                    data: data,
                    columns: [
                        { data: 'no' },
                        { data: 'filenameD' },
                        { data: 'artist' },
                        { data: 'title' },
                        { data: 'operation', "orderable": false }
                    ],
                    language: tableLanguage[langUtil.getCurLang()]
                });
        }
        langUtil.refreshpage();
    });
});