# NeteaseMusicCacheDecoder 网易云音乐缓存解码器 

## Introduction

This app is used to convert Netease Music cache file into valid MP3 music. It allows to assign renaming rule which would rename music by the original cache filename(music ID) and update meta data of the music. Music meta data describes several music properties such as artist, album, cover image, etc. Netease Music identification code(163 key) is added, which can let Netease Music recognize the music as downloaded one, in order to view its lyric and comments.

This project is built by Nodejs together with Electron. MacOS and Linux system is supportted except Windows. MacOS version can locate cache directory automatically, which let the convertion be easy.

**This project is for techniques, I recommented to support genuine music.**

## Lastest version

v3.3.0 primary version, updated at Feb. 3, 2020 China Standard Time

## Installation

### Windows version

Unzip the downloaded package to any directory(system directory is not recommended), double click on `NeteaseMusicCacheDecoder.exe` to start.

### macOS version

Unzip the downloaded package, copy two files(`NeteaseMusicCacheDecoder` and `settings.json`) to another directory. Double click the app `NeteaseMusicCacheDecoder`, you may encounter an trust warning which notifies the package downloaded from Github, click "Open" to start.

## How to use

### Basics and notices

- The affixation(extension name) of Netease Music cache files is uc(Windows) or uc!(macOS). Only the file ends with these two affixation can be converted.
- Auto renaming depends on the music ID part in the cache filename. This feature would be failed if the provided ID is wrong.
- If cache file does not contain music ID or information does not obtained, the converted music will be named as its orginal file name.
- The default rule for auto renaming is `Artist - Song Title`.mp3, the "Reset" button to the right can reset to default rule.
- Auto renaming would fill in the meta data of music.
- Auto renaming and meta data filling needs Internet connection.
- For expired music, it is highly possible that music information cannot be obtained.
- Convertion would not check the integrity of music: incomplete cache file could not be played after convertion.
- In macOS version, a window asked for allowing calendar could be appear when selecting cache directory. Any selection is allowed. The app does not need to read anything related to calendar.

### If a single file needs convertion...

- Use "Single File" tab
- Select cache file to be converted, with the affixation(extension name) is uc(Windows) or uc!(macOS). If the checkbox `Search in the default cache directory` is selected, when selecting cache file, it is prior to select directory in the default cache directory.
- Select target directory to store converted music files
- Decide renaming methods(Manually wrote/Auto renaming) and rules
- Click "Decode"

### If a batch of files need convertion... 

- Use "Batch Processing" tag
- Select the directory which contains the cache files to be converted.If the checkbox `Search in the default cache directory` is selected, the default cache directory will be used.
- Select the target directory to store converted music files
- Decide renaming methods(Manually wrote/Auto renaming) and rules
- Click "Decode"

### If there are tons of caches in directory but I only need some of them... 

- Use "Batch Processing" tag
- Select the directory which contains the cache files to be converted.If the checkbox `Search in the default cache directory` is selected, the default cache directory will be used.
- Select the target directory to store converted music files
- Decide renaming methods(Manually wrote/Auto renaming) and rules
- Click "Scan cache files"
- Find the music you wanted in the following table, click on "Decode it" to convert it to music file which is saved at target directory

### Update

- When a new update is available, an "!" mark will appear to the right of the "About" tab. There are some details in the "About" tab page together with the download button.
- The new app package is downloaded. You need to unpack it like a fresh new installation.
- If previous settings are needed, you can copy previous `settings.json` and replace the new one.
- No update, no notice.

### Auto Renaming

Auto renaming provides eight available properties of a music: artist, song title, album name, music ID, alias, company, track number, disc number. You can combine any of these properties to build music filename. The renaming rule needs to avoid same-name conflict, otherwise, the latter-finished file will **replace** the former-finished one. The default renaming rule is `Artist - Song Title`.mp3. **The most possible conflict case would happen when there are several versions for one music. Please take care of this case.**

**Conflict example: The main theme of "Case Closed"**

| Property | Version 1 | Version 2 |
| -------- | -------- | -------- |
| Music ID     | 28188343     | 28188284     |
| Sont Title   | 「名探偵コナン」メイン・テーマ     | 「名探偵コナン」メイン・テーマ     |
| Artist   | 大野克夫     | 大野克夫     |
| Album   | 「名探偵コナン」オリジナルサウンドトラック2     | 「名探偵コナン」オリジナルサウンドトラック1     |
| Alias   |      |      |
| Company   | ポリドール     | ポリドール     |
| Track Number   | 36     | 1     |
| Disc Number   | 1     | 1     |

For these two versions, the titles are same but the album and the genre are different. We need another property like album to identify them.
**The rule containing music ID can make sure non-repeating. The rule combined with album, artist and song title would cause a really low probability of repeating.**


**Alias**

Alias is commonly used to describe a music, which is in gray color, following the song name. For instance, the song "PUZZLE" by Mai Kuraki(倉木麻衣), its alias is `映画「名探偵コナン 漆黒の追跡者(チェイサー)」EDテーマ`(The ending theme of movie *Detective Conan: The Raven Chaser*). If alias is appeared in the rule, it will be wrapped by a pair of parentheses. For the case above, the target file name would be: `倉木麻衣 - PUZZLE(映画「名探偵コナン 漆黒の追跡者(チェイサー)」EDテーマ).mp3`.

## Music Meta Data

Music meta data contains serveral properties which describes a music like its artist, album and cover image.

Supported meta data:
- artist
- album
- song title
- trackNumber
- copyright
- cover
- comment，which allows Netease Music identifing music as downloaded one 

## Development Plans

- ~~Multilanguage support(English, Traditional Chinese)~~ √
- Update notice/hint/warning content
- ~~Auto update music meta data when converting~~ √
- ~~Converted music can be identified by Netease Music~~ √
- View music info
- Detect music integrity
- Detect cache directory for Windows
- Simple player to play the music sample
- Solve the possible renaming conflict

## History

### v3.4.0 Convert music you wanted in the directory

- When there are lots of caches in a directory, we can convert some of them by their artists and titles

### v3.3.0 Auto meta data filling

- Fill meta data automatically when auto renaming music
- Converted music using auto renaming can be identified as downloaded music by Netease Music
- Solve the issue that music name contains slash symbol

### v3.2.0 Multilanguage support

- Multilanguage support(English, Simplified Chinese)
- Check update manually
- Renew URL for update checking, in order to solve the firewall issue

### v3.1.0 Rebuild app by Electron

- Solve the issue of wrong music name in version series 2
- Support macOS
- Redesign UI
- Allow custom renaming rule
- Auto update check

## Announcement
This project is free to obtain. Please assign the link of project to your sharing content. All consequences have no association with developer during its sharing procedures.

## Project Link

Github：https://github.com/lchloride/NeteaseMusicCacheDecoder

Please leave message at issue if there are something strange. All kinds of advices are welcomed.
