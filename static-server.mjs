#!/usr/bin/env node
/**
 * 高性能静态服务器（零依赖）
 * 解决公网隧道下 vite dev / vite preview 的三大慢点：
 *   1. gzip/br 预压缩优先，其次动态 gzip（带内存缓存）—— 减小传输体积
 *   2. 带 hash 的静态资源设置 immutable 长缓存 —— 省掉重复的隧道往返
 *   3. 直接服务构建产物而非 dev 模式 —— 请求数从数百降到十个左右
 * 同时内置 API 反代，替代 vite 的 dev proxy。
 *
 * 用法:
 *   node static-server.mjs --port 82 --root <distDir> --api /dev-api=http://localhost:8081
 * --api 可重复传入，多个前缀。
 */
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'
import { pipeline } from 'node:stream'

// ---------- 参数 ----------
function parseArgs(argv) {
  const out = { port: 0, root: '', apis: [], redirects: [] }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port') out.port = Number(argv[++i])
    else if (a === '--root') out.root = path.resolve(argv[++i])
    else if (a === '--api') {
      const v = argv[++i]
      const idx = v.indexOf('=')
      if (idx > 0) out.apis.push({ prefix: v.slice(0, idx), target: new URL(v.slice(idx + 1)) })
    } else if (a === '--redirect') {
      // 例: --redirect /=/admin  把入口路径跳到后台（后台独立地址用）
      const v = argv[++i]
      const idx = v.indexOf('=')
      if (idx > 0) out.redirects.push({ from: v.slice(0, idx), to: v.slice(idx + 1) })
    }
  }
  if (!out.port || !out.root) {
    console.error('用法: node static-server.mjs --port <port> --root <dir> [--api /dev-api=http://host:port] [--redirect /=/admin]')
    process.exit(1)
  }
  // 最长前缀优先，避免 /dev-api 抢了 /dev-api-x
  out.apis.sort((x, y) => y.prefix.length - x.prefix.length)
  return out
}
const ARGS = parseArgs(process.argv)

// ---------- MIME ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
}
const COMPRESSIBLE = new Set([
  '.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt', '.map',
  '.svg', '.ico', '.ttf', '.otf', '.eot', '.wasm',
])

// ---------- 工具 ----------
async function statSafe(p) {
  try { return await fsp.stat(p) } catch { return null }
}

/** 带 hash 指纹的资源 → 永久强缓存；图片字体 → 一周；其余(html等) → 协商缓存 */
function cacheControl(urlPath) {
  if (/^\/(assets|static)\//.test(urlPath) &&
      /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(urlPath)) {
    return 'public, max-age=31536000, immutable'
  }
  if (/\.(png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4)$/i.test(urlPath)) {
    return 'public, max-age=604800'
  }
  return 'no-cache'
}

// 动态 gzip 结果缓存（key = 文件路径 + mtime），避免重复压缩大文件
const gzCache = new Map()
const GZ_CACHE_MAX = 300
function gzipCached(key, buf) {
  let hit = gzCache.get(key)
  if (!hit) {
    hit = zlib.gzipSync(buf, { level: 6 })
    gzCache.set(key, hit)
    if (gzCache.size > GZ_CACHE_MAX) gzCache.delete(gzCache.keys().next().value)
  }
  return hit
}

// ---------- API 反代 ----------
function proxy(req, res, api) {
  let targetPath = req.url.slice(api.prefix.length)
  if (!targetPath || targetPath[0] !== '/') targetPath = '/' + (targetPath || '')
  const headers = { ...req.headers }
  headers.host = api.target.host // 等价于 changeOrigin: true

  const sender = (proto) => {
    const pr = proto.request({
      protocol: api.target.protocol,
      hostname: api.target.hostname,
      port: api.target.port || (api.target.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: targetPath,
      headers,
    }, (pres) => {
      res.writeHead(pres.statusCode || 502, pres.headers)
      pipeline(pres, res, () => {})
    })
    pr.on('error', (e) => {
      if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Bad Gateway: ' + e.message)
    })
    pipeline(req, pr, () => {})
  }

  if (api.target.protocol === 'https:') {
    import('node:https').then((m) => sender(m.default)).catch((e) => {
      res.writeHead(502); res.end('Bad Gateway: ' + e.message)
    })
  } else {
    sender(http)
  }
}

// ---------- 静态文件 ----------
async function serveStatic(req, res) {
  const rawPath = (req.url || '/').split('?')[0]
  let urlPath
  try { urlPath = decodeURIComponent(rawPath) } catch { urlPath = rawPath }
  if (urlPath.includes('\0')) { res.writeHead(400); return res.end('Bad Request') }

  const resolved = path.resolve(ARGS.root, '.' + urlPath)
  if (!resolved.startsWith(ARGS.root)) { res.writeHead(403); return res.end('Forbidden') }

  let filePath = resolved
  let st = await statSafe(filePath)
  if (st && st.isDirectory()) {
    filePath = path.join(filePath, 'index.html')
    st = await statSafe(filePath)
  }
  if (!st || !st.isFile()) {
    // SPA fallback：无扩展名或 html 请求一律回 index.html
    const ext = path.extname(urlPath)
    if (!ext || ext === '.html') {
      filePath = path.join(ARGS.root, 'index.html')
      st = await statSafe(filePath)
    }
  }
  if (!st || !st.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('Not Found')
  }

  const ext = path.extname(filePath).toLowerCase()
  const etag = `W/"${st.size}-${Math.round(st.mtimeMs)}"`
  const lastMod = st.mtime.toUTCString()
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': cacheControl(urlPath),
    'ETag': etag,
    'Last-Modified': lastMod,
    'Vary': 'Accept-Encoding',
    'X-Served-By': 'pet-static',
  }

  // 协商缓存命中 → 304，零 body，隧道只传一个包头
  const inm = req.headers['if-none-match']
  const ims = req.headers['if-modified-since']
  if ((inm && inm === etag) || (!inm && ims && new Date(ims).getTime() >= Math.floor(st.mtimeMs / 1000) * 1000)) {
    res.writeHead(304, headers)
    return res.end()
  }

  const ae = String(req.headers['accept-encoding'] || '')
  const wantGzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(ae)
  let body = null
  let encoding = null

  if (wantGzip) {
    // 优先用 vite 预生成的 .gz（零 CPU）
    const gzPath = filePath + '.gz'
    const gst = await statSafe(gzPath)
    if (gst && gst.isFile() && gst.mtimeMs >= st.mtimeMs) {
      body = await fsp.readFile(gzPath)
      encoding = 'gzip'
    }
  }
  if (!body) {
    body = await fsp.readFile(filePath)
    if (wantGzip && body.length > 1024) {
      body = gzipCached(filePath + ':' + Math.round(st.mtimeMs), body)
      encoding = 'gzip'
    }
  }
  if (encoding) headers['Content-Encoding'] = encoding
  headers['Content-Length'] = body.length

  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  res.end(body)
}

// ---------- 路由 ----------
const server = http.createServer((req, res) => {
  const url = req.url || '/'
  const api = ARGS.apis.find((a) => url === a.prefix || url.startsWith(a.prefix + '/') || url.startsWith(a.prefix + '?'))
  if (api) return proxy(req, res, api)

  // 入口跳转（后台独立地址：访问 / 直接进 /admin）
  if (ARGS.redirects.length) {
    const u = (req.url || '/').split('?')[0]
    const red = ARGS.redirects.find((r) =>
      r.from === '/' ? (u === '/' || u === '/index.html') : (u === r.from || u.startsWith(r.from + '/'))
    )
    if (red) {
      const target = red.from === '/' && u === '/index.html' ? red.to : red.to + (u.slice(red.from.length) || '')
      res.writeHead(302, { Location: target, 'Cache-Control': 'no-store' })
      return res.end()
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    return res.end('Method Not Allowed')
  }
  serveStatic(req, res).catch((e) => {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Internal Error: ' + e.message)
  })
})

server.keepAliveTimeout = 65000
server.headersTimeout = 66000
server.listen(ARGS.port, '0.0.0.0', () => {
  console.log(`[pet-static] http://0.0.0.0:${ARGS.port}  root=${ARGS.root}`)
  for (const a of ARGS.apis) console.log(`[pet-static]   ${a.prefix} -> ${a.target.origin}`)
})
