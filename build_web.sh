#!/usr/bin/env bash
# 构建前端生产包到 pet-web/dist，并生成 .gz 预压缩文件
# 用法: bash build_web.sh
set -eu

src="${BASH_SOURCE[0]}"
case "$src" in
  */*) ROOT="$(cd "${src%/*}" && pwd)" ;;
  *)   ROOT="$(pwd)" ;;
esac
cd "$ROOT"

NODE="$(command -v node 2>/dev/null || true)"
[ -n "$NODE" ] || { echo "未找到 node"; exit 1; }

# 旧产物先移走（不用 rm -rf，避免误删；VACUUM 目录可手动清理）
if [ -d "$ROOT/pet-web/dist" ]; then
  TRASH="${TEMP:-/tmp}/pet-dist-trash"
  mkdir -p "$TRASH"
  mv "$ROOT/pet-web/dist" "$TRASH/dist-$(date +%s)"
  echo "==> 旧产物已移入 $TRASH"
fi

cd "$ROOT/pet-web"
echo "==> 构建 pet-web -> dist"
"$NODE" node_modules/vite/bin/vite.js build --outDir dist

cd "$ROOT"
echo "==> 预压缩静态资源（生成 .gz，静态服务零 CPU 直接吐压缩产物）"
"$NODE" -e '
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const exts = new Set([".js", ".css", ".html", ".json", ".svg", ".map", ".txt", ".xml"]);
const root = "./pet-web/dist";
let n = 0, saved = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (e.name.endsWith(".gz")) continue;
    if (!exts.has(path.extname(e.name).toLowerCase())) continue;
    const buf = fs.readFileSync(p);
    if (buf.length < 1024) continue;
    const gz = zlib.gzipSync(buf, { level: 9 });
    fs.writeFileSync(p + ".gz", gz);
    n++; saved += buf.length - gz.length;
  }
})(root);
console.log("  " + root + ": " + n + " 个文件, 节省 " + (saved / 1048576).toFixed(2) + " MB");
'
echo "==> 完成。重启前端静态服务后生效： bash start_all.sh"
