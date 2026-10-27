#!/usr/bin/env bash
# 后端打包（直接用系统 mvn，避免 Git Bash 下 classworlds 路径解析问题）
# 用法: bash build_backend.sh clean package -DskipTests
set -eu

src="${BASH_SOURCE[0]}"
case "$src" in
  */*) ROOT="$(cd "${src%/*}" && pwd)" ;;
  *)   ROOT="$(pwd)" ;;
esac

MVN="$(command -v mvn 2>/dev/null || true)"
if [ -z "$MVN" ]; then
  echo "未找到 mvn，请安装 Maven 并加入 PATH"; exit 1
fi
[ "$#" -gt 0 ] || set -- clean package -DskipTests

cd "$ROOT/ruoyi"
"$MVN" "$@"
echo "==> 产物: ruoyi/ruoyi-admin/target/ruoyi-admin.jar"
