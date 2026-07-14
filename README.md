# 成绩袋

山东财经大学教务系统成绩查询与均分计算工具。支持获取全部学期成绩、新成绩提醒、必修课加权均分、所有课程加权均分和简单平均分。

所有教务系统请求都由使用者自己的电脑完成。项目不会把教务密码上传到第三方服务器。

## 功能

- 一键查询全部学期成绩
- 自动识别新成绩
- 必修课与全部课程均分计算
- 支持“优秀”等定性成绩折算
- 支持临时查询朋友成绩
- macOS 和 Windows 均支持系统级加密自动登录
- 成绩数据只保存在本机浏览器

## macOS 安装

需要 Node.js 22.13 或更高版本。

1. 在 GitHub 页面点击 `Code → Download ZIP`。
2. 解压下载的文件。
3. 双击 `install-grade-pocket.command` 完成安装。
4. 安装完成后，桌面会自动出现“成绩袋”应用。
5. 以后双击桌面上的“成绩袋”即可在后台启动，并自动打开浏览器。

macOS 第一次运行脚本时，如果提示无法打开，可以右键脚本并选择“打开”。

## Windows 安装

需要先安装 [Node.js 22.13 或更高版本](https://nodejs.org/)。安装时保持默认选项即可。

1. 在 GitHub 页面点击 `Code → Download ZIP`。
2. 右键下载的 ZIP，选择“属性”；如果底部有“解除锁定”，勾选后点击“应用”。
3. 解压下载的文件，不要直接在压缩包内运行。若出现两层同名文件夹，请进入能看到安装脚本的里面一层。
4. 双击 `install-grade-pocket.bat`，等待依赖和浏览器组件安装完成。
5. 安装完成后，桌面会自动出现“成绩袋”快捷方式。
6. 双击 `setup-auto-login.bat`，设置一次自己的教务账号和密码。
7. 以后双击桌面上的“成绩袋”即可在后台启动，并自动打开浏览器。

安装脚本使用 Windows CRLF 换行和纯 ASCII 源码，兼容 Windows PowerShell 5.1。自动登录设置窗口使用英文提示，以避免不同中文系统代码页造成脚本解析失败。

## Windows 安装排错

安装窗口闪退或需要查看真实错误时，在项目文件夹的地址栏输入下面这条命令：

```cmd
cmd /k install-grade-pocket.bat
```

如果仍需手动安装，请在 CMD 中逐条运行，不要在 PowerShell 中直接输入 `npm`：

```cmd
npm.cmd install --no-audit --no-fund
node_modules\.bin\playwright.cmd install webkit
```

桌面快捷方式创建失败不会使整个安装失败。此时可以运行 `start-grade-pocket.bat`，或者在 CMD 中逐条执行：

```cmd
start "Grade Pocket Connector" cmd /k npm.cmd run connector
start "Grade Pocket Web" cmd /k npm.cmd run dev
start "" "http://localhost:3000"
```

常见提示说明：

- `npm warn deprecated`、`allow-scripts` 和审计漏洞数量属于依赖警告，不代表安装失败。不要运行 `npm audit fix --force`，它可能引入不兼容更新。
- `npm ERR!` 通常表示网络或依赖下载失败，请更换网络后重试。
- `Node.js was not found` 表示 Node.js 未安装，或安装后没有重新打开命令窗口。
- 启动超时时，查看项目 `.runtime` 文件夹中的 `web.err.log` 和 `connector.err.log`。

## 自动登录

macOS 用户可以双击 `setup-auto-login.command`，按提示输入自己的教务账号和密码。密码会保存到 macOS 钥匙串，不会写进项目文件或浏览器存储。

Windows 用户可以双击 `setup-auto-login.bat`，在 PowerShell 窗口中输入一次教务账号和密码。密码由 Windows DPAPI 加密，保存在当前用户的 `%APPDATA%\GradePocket` 中，只能由同一台电脑上的同一 Windows 用户解密。

设置完成后，macOS 和 Windows 都可以在登录过期时后台自动重新登录，点击“刷新成绩”不再弹出教务窗口。

## 临时查询朋友成绩

在成绩袋中点击“查询朋友成绩”，让朋友本人输入教务账号和密码。连接器会创建独立临时会话：

- 不复用你的登录状态
- 不保存朋友的密码
- 不覆盖你的成绩
- 返回“我的成绩”后清除朋友的临时成绩

## 安全说明

- `connector/profile/` 保存本机登录会话，已被 Git 忽略，禁止上传。
- `.env`、数据库、缓存和依赖目录均不会提交。
- 请勿在截图、Issue 或聊天中公开教务账号和密码。
- 山东财经大学教务系统目前使用 HTTP，建议仅在可信网络环境下使用。

## 开发

```bash
npm install
npx playwright install webkit
npm run dev
npm run connector
```

构建检查：

```bash
npm run build
```

## 平台支持

| 功能 | macOS | Windows |
| --- | --- | --- |
| 安装后生成桌面启动器 | “成绩袋.app” | “成绩袋”快捷方式 |
| 查询全部成绩 | 支持 | 支持 |
| 临时查询朋友成绩 | 支持 | 支持 |
| 保存登录会话 | 支持 | 支持 |
| 系统级加密自动登录 | macOS 钥匙串 | Windows DPAPI |
