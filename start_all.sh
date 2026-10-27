#!/usr/bin/env bash
# 一键拉起本地全套服务（Git Bash / WSL 均可，脚本自身目录即项目根）
#   Redis 6379（缺省用内置内存版）→ 后端 8081 → 前台 82 → 后台入口 83
#   前端走 static-server 直接服务生产包（pet-web/dist）
#   改完前端源码后先执行: bash build_web.sh
set -u

# ---- 定位项目根：不依赖 dirname，纯参数展开 + 内建 cd/pwd ----
src="${BASH_SOURCE[0]}"
case "$src" in
  */*) ROOT="$(cd "${src%/*}" && pwd)" ;;
  *)   ROOT="$(pwd)" ;;
esac
cd "$ROOT" || { echo "无法进入项目根: $ROOT"; exit 1; }
echo "项目根: $ROOT"

NODE="$(command -v node 2>/dev/null || true)"
JAVA_BIN="$(command -v java 2>/dev/null || true)"
[ -n "$NODE" ] || { echo "未找到 node，请安装 Node.js 18+"; exit 1; }
[ -n "$JAVA_BIN" ] || { echo "未找到 java，请安装 JDK 17+"; exit 1; }

port_up () { netstat -ano 2>/dev/null | grep -q ":$1 .*LISTENING"; }

http_up () {
  local code
  code=$(curl -s --noproxy '*' -o /dev/null -w '%{http_code}' --max-time 3 "http://localhost:$1/$2" 2>/dev/null)
  [ "$code" = "200" ] || [ "$code" = "302" ]
}

# 1) Redis
if port_up 6379; then
  echo "redis   : 6379 已在运行"
elif [ -f .runtime/redis-lite.mjs ]; then
  "$NODE" .runtime/redis-lite.mjs > /tmp/redis-lite.log 2>&1 &
  sleep 2
  port_up 6379 && echo "redis   : 已用内置内存版启动（重启即清空，仅本地用）" || echo "redis   : 启动失败，见 /tmp/redis-lite.log"
else
  echo "redis   : 未运行且缺少 .runtime/redis-lite.mjs，请手动启动 Redis"
fi

# 2) 后端 8081
if curl -s --noproxy '*' -o /dev/null --max-time 3 http://localhost:8081/pet/category/list 2>/dev/null; then
  echo "backend : 8081 已在运行"
else
  if [ ! -f ruoyi/ruoyi-admin/target/ruoyi-admin.jar ]; then
    echo "backend : 缺少 ruoyi/ruoyi-admin/target/ruoyi-admin.jar，请先 bash build_backend.sh clean package -DskipTests"
    exit 1
  fi
  "$JAVA_BIN" -jar ruoyi/ruoyi-admin/target/ruoyi-admin.jar --server.port=8081 > /tmp/backend-8081.log 2>&1 &
  echo -n "backend : 启动中"
  for i in $(seq 1 30); do
    if curl -s --noproxy '*' -o /dev/null --max-time 3 http://localhost:8081/pet/category/list 2>/dev/null; then
      echo " -> UP ($((i * 2))s)"; break
    fi
    echo -n "."
    sleep 2
  done
fi

# 3) 前端生产包
if [ ! -f pet-web/dist/index.html ]; then
  echo "frontend: 缺少 pet-web/dist，请先执行 bash build_web.sh"; exit 1
fi

if http_up 82 shop/home; then
  echo "frontend: 82 已在运行"
else
  "$NODE" static-server.mjs --port 82 --root ./pet-web/dist \
    --api /dev-api=http://localhost:8081 > /tmp/petstatic-82.log 2>&1 &
  echo "frontend: 82 启动中"
fi

if http_up 83 admin; then
  echo "admin   : 83 已在运行"
else
  "$NODE" static-server.mjs --port 83 --root ./pet-web/dist \
    --api /dev-api=http://localhost:8081 --redirect /=/admin > /tmp/petstatic-83.log 2>&1 &
  echo "admin   : 83 启动中"
fi

sleep 2
echo
echo "================ 访问地址 ================"
echo " 前台商城 : http://localhost:82/shop/home"
echo " 管理后台 : http://localhost:83   （打开即后台登录页）"
echo " 后端接口 : http://localhost:8081"
echo " 登录账号 : admin / admin123"
echo "=========================================="
echo "日志: /tmp/backend-8081.log  /tmp/petstatic-82.log  /tmp/petstatic-83.log"
