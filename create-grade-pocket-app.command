#!/bin/zsh

set -e

SCRIPT_DIR="${0:A:h}"
APP_PATH="$HOME/Desktop/成绩袋.app"
LAUNCHER_PATH="$SCRIPT_DIR/launch-grade-pocket-background.command"
SOURCE_FILE="$SCRIPT_DIR/macos/GradePocket.applescript"

mkdir -p "$SCRIPT_DIR/macos" "$SCRIPT_DIR/.runtime"
sed "s|__LAUNCHER_PATH__|$LAUNCHER_PATH|g" "$SOURCE_FILE" >"$SCRIPT_DIR/.runtime/GradePocket.generated.applescript"
osacompile -o "$APP_PATH" "$SCRIPT_DIR/.runtime/GradePocket.generated.applescript"

echo "已创建：$APP_PATH"
open -R "$APP_PATH"
