# 成绩袋

山东财经大学教务系统成绩查询与均分计算工具。支持获取全部学期成绩、新成绩提醒、必修课加权均分、所有课程加权均分和简单平均分。

所有教务系统请求都由使用者自己的电脑完成。项目不会把教务密码上传到第三方服务器。

## 功能

- 一键查询全部学期成绩
- 自动识别新成绩
- 必修课与全部课程均分计算
- 支持“优秀”等定性成绩折算
- 支持临时查询朋友成绩
- macOS 可将自动登录密码保存到系统钥匙串
- 成绩数据只保存在本机浏览器

## macOS 安装

需要 Node.js 22.13 或更高版本。

1. 在 GitHub 页面点击 `Code → Download ZIP`。
2. 解压下载的文件。
3. 双击 `install-grade-pocket.command` 完成安装。
4. 双击 `start-grade-pocket.command` 启动成绩袋。
5. 浏览器会自动打开 `http://localhost:3000`。

macOS 第一次运行脚本时，如果提示无法打开，可以右键脚本并选择“打开”。

## Windows 安装

需要先安装 [Node.js 22.13 或更高版本](https://nodejs.org/)。安装时保持默认选项即可。

1. 在 GitHub 页面点击 `Code → Download ZIP`。
2. 解压下载的文件，不要直接在压缩包内运行。
3. 双击 `install-grade-pocket.bat`，等待依赖和浏览器组件安装完成。
4. 双击 `start-grade-pocket.bat` 启动成绩袋。
5. 请保持弹出的两个命令窗口开启，浏览器会自动打开 `http://localhost:3000`。

如果 Windows 阻止脚本运行，可以右键 `.bat` 文件选择“属性”，勾选“解除锁定”后重试。也可以打开 PowerShell，进入项目文件夹后手动运行：

```powershell
npm install
npx playwright install webkit
```

然后分别打开两个 PowerShell 窗口运行：

```powershell
npm run dev
```

```powershell
npm run connector
```

## 自动登录

macOS 用户可以双击 `setup-auto-login.command`，按提示输入自己的教务账号和密码。密码会保存到 macOS 钥匙串，不会写进项目文件或浏览器存储。

Windows 当前不保存教务密码；第一次使用或登录过期时，需要在连接器打开的窗口中手动登录。登录会话会保存在本机，关闭成绩袋不会立即失效。

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
| 一键安装和启动 | 支持 | 支持 |
| 查询全部成绩 | 支持 | 支持 |
| 临时查询朋友成绩 | 支持 | 支持 |
| 保存登录会话 | 支持 | 支持 |
| 系统钥匙串自动登录 | 支持 | 暂不支持 |
