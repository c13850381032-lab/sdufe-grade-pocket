#!/bin/zsh

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR" || exit 1

echo "正在安装成绩袋，请保持网络连接……"
npm install || exit 1
npx playwright install webkit || exit 1
"$SCRIPT_DIR/create-grade-pocket-app.command" || exit 1

echo ""
echo "安装完成。桌面上已经创建“成绩袋”应用，以后双击它即可运行。"
echo "如果需要为自己的账号启用自动登录，请再双击 setup-auto-login.command。"
read "REPLY?按回车键关闭……"
