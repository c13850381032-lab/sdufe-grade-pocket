#!/bin/zsh

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR" || exit 1

if [[ ! -d node_modules ]]; then
  echo "尚未安装成绩袋，请先双击 install-grade-pocket.command。"
  read "REPLY?按回车键关闭……"
  exit 1
fi

cleanup() {
  [[ -n "$CONNECTOR_PID" ]] && kill "$CONNECTOR_PID" 2>/dev/null
  [[ -n "$WEB_PID" ]] && kill "$WEB_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

npm run connector &
CONNECTOR_PID=$!

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  WEB_PID=""
else
  npm run dev &
  WEB_PID=$!
fi

sleep 3
open "http://localhost:3000"

echo ""
echo "成绩袋已经启动。请保持这个窗口开启；关闭窗口后服务会停止。"
echo ""
wait
