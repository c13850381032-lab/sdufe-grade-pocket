# 成绩袋

山东财经大学教务系统成绩查询与均分计算工具。支持获取全部学期成绩、新成绩提醒、必修课加权均分、所有课程加权均分和简单平均分。

所有教务系统请求都由使用者自己的电脑完成。项目不会把教务密码上传到第三方服务器。

## 功能

- 一键查询全部学期成绩
- 自动识别新成绩
- 必修课与全部课程均分计算
- 支持“优秀”等定性成绩折算
- 支持临时查询朋友成绩
- 支持导入多个学期的班级成绩 CSV，生成“全部课程加权榜”和“必修课程加权榜”
- 支持教务系统“成绩信息”横向表和“课程成绩 + 学分”成对表
- macOS 和 Windows 均支持系统级加密自动登录
- 成绩数据只保存在本机浏览器

## 班级成绩排名

进入页面的“班级排名”区域，点击“导入班级 CSV”，可以一次选择一个或多个学期的班级成绩表。重复导入同一位同学、同一学期、同一课程时，以最新记录为准。

支持以下格式：

1. 教务系统“成绩信息”横向表：保留原始前三行，课程表头中包含学分、学期和课程性质。
2. “课程 + 学分”成对表：前三列依次为学号、姓名、学期，后面每门课程成绩紧跟一列学分。
3. 通用明细表：包含学号或姓名、课程名称、学分、成绩，建议同时包含学期和课程性质。

当成对表没有课程性质时，成绩覆盖班级 75% 及以上同学的课程会自动视为公共必修课。导入的数据和计算结果仅保存在当前电脑的浏览器中，不会上传到 GitHub 或其他服务器。

Windows 用户可以直接导入 Excel 导出的 CSV。系统兼容 Windows 常见的 CRLF 换行，以及 UTF-8、GBK/GB18030 编码，不需要先在记事本中转码。

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
5. 安装完成后，桌面会自动出现“Grade Pocket”快捷方式。
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

## 已安装用户如何更新

### 使用 GitHub Desktop 安装或管理项目

1. 打开 GitHub Desktop，在左上角选择 `sdufe-grade-pocket` 项目。
2. 点击顶部的 `Fetch origin`；如果发现新版本，再点击 `Pull origin`。
3. 更新完成后，重新打开或刷新“成绩袋”页面即可使用新功能。
4. 如果更新后桌面启动器找不到项目，macOS 再运行一次 `install-grade-pocket.command`，Windows 再运行一次 `install-grade-pocket.bat`，启动器会按当前项目路径重新创建。

本次班级排名更新没有新增依赖，正常通过 GitHub Desktop 拉取后不需要重新安装，也不需要重新设置自动登录。

### 之前通过 ZIP 安装

1. 在 GitHub 项目页面重新下载最新 ZIP 并解压。
2. macOS 双击新文件夹中的 `install-grade-pocket.command`；Windows 双击 `install-grade-pocket.bat`。
3. 安装脚本会更新依赖并重新创建指向新文件夹的桌面启动器。
4. 自动登录凭据保存在 macOS 钥匙串或 Windows DPAPI 中，正常更新不会要求重新保存密码。

不要把含有真实姓名、学号或成绩的班级 CSV、截图提交到 GitHub。项目已忽略本地测试输出目录。

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
| 安装后生成桌面启动器 | “成绩袋.app” | “Grade Pocket”快捷方式 |
| 查询全部成绩 | 支持 | 支持 |
| 临时查询朋友成绩 | 支持 | 支持 |
| 导入班级 CSV 并生成双榜单 | 支持 | 支持 |
| 保存登录会话 | 支持 | 支持 |
| 系统级加密自动登录 | macOS 钥匙串 | Windows DPAPI |
