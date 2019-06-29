var settings = {
    settings: {},
    p: process.execPath.substring(0, process.execPath.indexOf('netease_music_decoder.app')),
    load: function () {
        try {
            var data = fs.readFileSync(this.p+'settings.json', { encoding: 'utf-8' });
        } catch (e) {
            msgbox.errorBox("读取配置文件出错:" + e.message);
            return;
        }
        try {
            this.settings = JSON.parse(data);
        } catch (e) {
            msgbox.errorBox("无法解析配置文件");
            return;
        }
    },
    getSetting: function (key) {
        return this.settings[key];
    },
    setSetting: function (key, value) {
        this.settings[key] = value;
    },
    write: function () {
        if (this.settings === {}) {
            msgbox.errorBox("不能写入空设置");
            return;
        }
        try {
            fs.writeFileSync(this.p+'settings.json', JSON.stringify(this.settings), { encoding: 'utf-8' });
        } catch (e) {
            msgbox.errorBox("写入配置文件出错:" + e.message);
            return;
        }
    }
};
settings.load();