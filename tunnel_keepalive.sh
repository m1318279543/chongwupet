#!/usr/bin/env bash
# 自愈式 cloudflared 随机隧道：前台常驻，崩溃自动重启
cd "D:/Undergraduate_courses/qiyekaifa/chongwupet" || exit 1
CF="./cloudflared.exe"
URL_FILE="/tmp/ct_url.txt"
: > /tmp/ct.log
while true; do
  echo "[$(date)] starting cloudflared (http2) ..." >> /tmp/ct.log
  "$CF" tunnel --url http://localhost:82 --protocol http2 > /tmp/ct.log 2>&1
  rc=$?
  # 从日志里抓最新分配到的网址，写到一个稳定文件方便读取
  grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/ct.log | tail -1 > "$URL_FILE"
  echo "[$(date)] cloudflared exited rc=$rc, restart in 5s..." >> /tmp/ct.log
  sleep 5
done
