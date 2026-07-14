#!/bin/zsh

set -u

SCRIPT_DIR="${0:A:h}"
RUNTIME_DIR="$SCRIPT_DIR/.runtime"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

cd "$SCRIPT_DIR" || exit 1

if [[ ! -d node_modules ]]; then
  echo "成绩袋尚未安装。请先双击 install-grade-pocket.command 完成安装。" >&2
  exit 1
fi

mkdir -p "$RUNTIME_DIR"

port_is_ready() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

if ! port_is_ready 3100; then
  nohup npm run connector >>"$RUNTIME_DIR/connector.log" 2>&1 &
  echo $! >"$RUNTIME_DIR/connector.pid"
fi

if ! port_is_ready 3000; then
  nohup npm run dev >>"$RUNTIME_DIR/web.log" 2>&1 &
  echo $! >"$RUNTIME_DIR/web.pid"
fi

for _ in {1..30}; do
  if port_is_ready 3000 && port_is_ready 3100; then
    open "http://localhost:3000"
    exit 0
  fi
  sleep 1
done

echo "成绩袋启动超时，请查看 $RUNTIME_DIR 中的日志。" >&2
exit 1
