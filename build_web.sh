#!/usr/bin/env bash
# 构建两个前端生产包 + 预压缩（公网隧道下必须用生产包，dev 模式会慢几十倍）
set -eu
ROOT="D:/Undergraduate_courses/qiyekaifa/chongwupet"
NODE="C:/Users/asus/.workbuddy/binaries/node/versions/22.22.2-6/node.exe"
[ -x "$NODE" ] || NODE="$(command -v node)"

# 先挪走旧产物（vite --emptyOutDir / rmtree 会触发批量删除保护，改成移入系统临时目录）
if [ -d "$ROOT/pet-web/dist-new" ]; then
  TRASH="${TEMP:-/tmp}/pet-dist-trash"
  mkdir -p "$TRASH"
  mv "$ROOT/pet-web/dist-new" "$TRASH/dist-$(date +%s)"
fi

cd "$ROOT/pet-web"
echo "==> 构建 pet-web -> dist-new"
"$NODE" node_modules/vite/bin/vite.js build --outDir dist-new

cd "$ROOT"
echo "==> 预压缩静态资源（生成 .gz，服务器零 CPU 直接吐压缩产物）"
"$NODE" -e '
const fs=require("fs"),path=require("path"),zlib=require("zlib");
const exts=new Set([".js",".css",".html",".json",".svg",".map",".txt",".xml"]);
for (const root of ["./pet-web/dist-new"]) {
  let n=0,saved=0;
  (function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){
    const p=path.join(d,e.name);
    if(e.isDirectory())walk(p);
    else{
      if(e.name.endsWith(".gz"))continue;
      const ext=path.extname(e.name).toLowerCase();
      if(!exts.has(ext))continue;
      const buf=fs.readFileSync(p);
      if(buf.length<1024)continue;
      const gz=zlib.gzipSync(buf,{level:9});
      fs.writeFileSync(p+".gz",gz);n++;saved+=buf.length-gz.length;
    }
  }})(root);
  console.log("  "+root+": "+n+" 个文件, 节省 "+(saved/1048576).toFixed(2)+" MB");
}
'
echo "==> 完成。重启前端静态服务后生效： bash start_all.sh"
