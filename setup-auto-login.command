#!/bin/zsh

echo "成绩袋自动登录设置"
echo "账号和密码将保存到 macOS 钥匙串，不会写入项目文件。"
echo ""
read "SDUFE_ACCOUNT?教务系统账号："
read -s "SDUFE_PASSWORD?教务系统密码："
echo ""

if [[ -z "$SDUFE_ACCOUNT" || -z "$SDUFE_PASSWORD" ]]; then
  echo "账号或密码为空，未进行保存。"
  read "REPLY?按回车键关闭……"
  exit 1
fi

security add-generic-password -a "$USER" -s "GradePocket SDUFE Username" -w "$SDUFE_ACCOUNT" -U >/dev/null
security add-generic-password -a "$USER" -s "GradePocket SDUFE Password" -w "$SDUFE_PASSWORD" -U >/dev/null

unset SDUFE_ACCOUNT SDUFE_PASSWORD
echo ""
echo "设置完成。以后登录过期时，成绩袋会自动重新登录。"
echo "如果 macOS 询问钥匙串访问权限，请选择“始终允许”。"
read "REPLY?按回车键关闭……"
