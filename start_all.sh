#!/usr/bin/env bash
# 一键拉起 chongwupet 全套服务
#   后端 8081 / 前台 82（/shop/*）/ 后台独立入口 83（/ 直接跳 /admin）/ 两条 cloudflared 隧道（自愈）
#   后台给管理人员单独发 83 的地址，进去就是后台登录页，不再与前台共用入口。
# 前端走 static-server（生产包 + gzip + 长缓存），公网访问才不慢。
# 改了前端源码后先执行: bash build_web.sh
set -u
ROOT="D:/Undergraduate_courses/qiyekaifa/chongwupet"
JAVA="D:/Undergraduate_courses/jdk-17/jdk-17.0.20.1+1/bin/java.exe"
NODE="C:/Users/asus/.workbuddy/binaries/node/versions/22.22.2-2/node.exe"
cd "$ROOT"

wait_port () { # $1=port $2=seconds
  for i in $(seq 1 "$2"); do
    if curl -s --noproxy '*' -o NUL --max-time 3 "http://localhost:$1/" 2>/dev/null; then
      echo "  :$1 UP (${i}s)"; return 0
    fi
    sleep 1
  done
  echo "  :$1 待确认（服务可能已在监听）"; return 0
}

# 注意：Windows 原生 curl 写 /dev/null 会返回 23，必须用 NUL；
#       且本机有 http_proxy，必须 --noproxy 否则代理的 502 会被当成"已启动"
up () {
  local c
  c=$(curl -s --noproxy '*' -o NUL -w '%{http_code}' --max-time 3 "http://localhost:$1/" 2>/dev/null)
  [ "$c" = "200" ] || [ "$c" = "302" ]
}

# 1) Redis
cd "D:/Redis"
if ! ./redis-cli.exe ping 2>/dev/null | grep -q PONG; then
  ./redis-server.exe > /tmp/redis.log 2>&1 &
  sleep 2
fi
echo "redis: $(./redis-cli.exe ping 2>&1 | head -1)"

# 2) 后端 8081
cd "$ROOT/ruoyi/ruoyi-admin/target"
if [ "$(curl -s --noproxy "*" -o NUL -w "%{http_code}" --max-time 3 http://localhost:8081/pet/category/list)" = "200" ]; then
  echo "  :8081 已在运行，跳过"
else
"$JAVA" -jar ruoyi-admin.jar --server.port=8081 > /tmp/backend-8081.log 2>&1 &
echo "backend launching..."
for i in $(seq 1 45); do
  c=$(curl -s --noproxy '*' -o NUL -w '%{http_code}' --max-time 4 "http://localhost:8081/pet/category/list")
  [ "$c" = "200" ] && { echo "  :8081 UP ($((i*2))s)"; break; }
  sleep 2
done
fi

# 3) 前端静态服务
cd "$ROOT"
[ -d pet-web/dist-new ] || { echo "缺少 pet-web/dist-new，请先执行 bash build_web.sh"; exit 1; }

if up 82; then echo "  :82 已在运行，跳过"; else
"$NODE" static-server.mjs --port 82 --root ./pet-web/dist-new \
  --api /dev-api=http://localhost:8081 > /tmp/petstatic-82.log 2>&1 &
echo "frontend(82) launching..."
wait_port 82 20
fi

# 3b) 后台独立入口 83：访问 / 直接 302 到 /admin
if up 83; then echo "  :83 已在运行，跳过"; else
"$NODE" static-server.mjs --port 83 --root ./pet-web/dist-new \
  --api /dev-api=http://localhost:8081 --redirect /=/admin > /tmp/petstatic-83.log 2>&1 &
echo "admin-entry(83) launching..."
wait_port 83 20
fi

# 4) 隧道（各自自愈，URL 每次重启都会变）
#    先清掉旧隧道进程/日志，保证打印出来的地址就是当前可用的
MSYS_NO_PATHCONV=1 taskkill /F /IM cloudflared.exe > /dev/null 2>&1 || true
rm -f /tmp/ct-82.log /tmp/ct-83.log
start_tunnel () { # $1=port $2=logfile
  (
    while true; do
      "$ROOT/cloudflared.exe" tunnel --url "http://localhost:$1" --protocol http2 > "$2" 2>&1
      sleep 5
    done
  ) &
}
start_tunnel 82 /tmp/ct-82.log
start_tunnel 83 /tmp/ct-83.log

echo "等待隧道分配地址..."
u82=""; u83=""
for i in $(seq 1 40); do
  u82=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/ct-82.log 2>/dev/null | tail -1)
  u83=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/ct-83.log 2>/dev/null | tail -1)
  [ -n "$u82" ] && [ -n "$u83" ] && break
  sleep 2
done
echo
echo "================ 访问地址 ================"
echo " 客户端前台 : ${u82:-未获取到}/shop/home"
echo " 管理后台   : ${u83:-未获取到}   （打开即后台登录页）"
echo " 本机直连   : 前台 http://localhost:82/shop/home"
echo "              后台 http://localhost:83  （自动跳 /admin）"
echo " 后台账号   : admin / admin123（登录后直接进入控制台）"
echo "=========================================="
wait
