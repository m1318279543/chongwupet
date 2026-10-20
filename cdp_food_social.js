// 诊断宠物粮详情弹窗的「点赞 + 评论区」是否可用（无头 Chrome + 手写 CDP）
const http = require('http')
const net = require('net')
const crypto = require('crypto')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9334
const ORIGIN = process.argv[2] || 'http://localhost:82'
const CARD_IDX = parseInt(process.argv[3] || '0', 10)   // 点第几张卡片
const sleep = ms => new Promise(r => setTimeout(r, ms))

function httpGetJson(url) {
  return new Promise((res, rej) => {
    http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)) } catch (e) { rej(e) } }) }).on('error', rej)
  })
}

class WS {
  constructor(url) {
    const u = new URL(url)
    this.host = u.hostname; this.port = u.port; this.path = u.pathname + (u.search || '')
    this.buf = Buffer.alloc(0); this.handlers = []; this.id = 0; this.pending = new Map()
  }
  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64')
      this.sock = net.connect(this.port, this.host, () => {
        this.sock.write(`GET ${this.path} HTTP/1.1\r\nHost: ${this.host}:${this.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`)
      })
      this.sock.on('error', reject)
      let hs = false
      this.sock.on('data', chunk => {
        if (!hs) {
          const s = chunk.toString('latin1'); const idx = s.indexOf('\r\n\r\n')
          if (idx < 0) return
          hs = true; this.buf = chunk.subarray(idx + 4); this._parse(); resolve()
        } else { this.buf = Buffer.concat([this.buf, chunk]); this._parse() }
      })
    })
  }
  _parse() {
    for (;;) {
      if (this.buf.length < 2) return
      const b0 = this.buf[0], b1 = this.buf[1]
      const opcode = b0 & 0x0f
      let len = b1 & 0x7f, off = 2
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4 }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10 }
      const masked = (b1 & 0x80) !== 0
      let mask = null
      if (masked) { if (this.buf.length < off + 4) return; mask = this.buf.subarray(off, off + 4); off += 4 }
      if (this.buf.length < off + len) return
      let payload = this.buf.subarray(off, off + len)
      if (masked) { payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4] }
      this.buf = this.buf.subarray(off + len)
      this._emit(opcode, payload)
    }
  }
  _emit(opcode, payload) {
    if (opcode === 8) { try { this.sock.end() } catch (e) {} return }
    if (opcode !== 1) return
    let data; try { data = JSON.parse(payload.toString('utf8')) } catch (e) { return }
    if (data.id && this.pending.has(data.id)) {
      const p = this.pending.get(data.id); this.pending.delete(data.id)
      data.error ? p.rej(new Error(JSON.stringify(data.error))) : p.res(data.result); return
    }
    this.handlers.forEach(h => h(data))
  }
  on(fn) { this.handlers.push(fn) }
  send(method, params) {
    const id = ++this.id
    const msg = Buffer.from(JSON.stringify({ id, method, params: params || {} }), 'utf8')
    const mask = crypto.randomBytes(4); const len = msg.length
    let header
    if (len < 126) header = Buffer.from([0x81, 0x80 | len])
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x81; header[1] = 0x80 | 126; header.writeUInt16BE(len, 2) }
    else { header = Buffer.alloc(10); header[0] = 0x81; header[1] = 0x80 | 127; header.writeBigUInt64BE(BigInt(len), 2) }
    const masked = Buffer.from(msg); for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4]
    this.sock.write(Buffer.concat([header, mask, masked]))
    return new Promise((res, rej) => this.pending.set(id, { res, rej }))
  }
  evalExpr(expr, awaitPromise = false) {
    return this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise })
  }
}

;(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cdpfood'))
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userData}`,
    '--no-first-run', '--disable-gpu', '--disable-extensions', '--window-size=1400,1000', 'about:blank'
  ], { stdio: 'ignore' })

  let targets = null
  for (let i = 0; i < 60; i++) {
    try { targets = await httpGetJson(`http://127.0.0.1:${PORT}/json/list`); break }
    catch (e) { await sleep(500) }
  }
  if (!targets) { console.log('FAIL: chrome debug port 未就绪'); chrome.kill(); return }
  const page = targets.find(t => t.type === 'page')
  const ws = new WS(page.webSocketDebuggerUrl); await ws.connect()

  const errs = []
  ws.on(d => {
    if (d.method === 'Runtime.exceptionThrown') {
      const e = d.params.exceptionDetails
      errs.push('EXC: ' + ((e.exception && e.exception.description) || e.text || '').split('\n')[0])
    }
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
      const a = (d.params.args || []).map(x => x.value !== undefined ? JSON.stringify(x.value) : (x.description || '')).join(' | ')
      errs.push('CONSOLE.' + d.params.type + ': ' + a.slice(0, 300))
    }
    if (d.method === 'Log.entryAdded') {
      const e = d.params.entry
      if (['error', 'warning'].includes(e.level)) errs.push('LOG[' + e.level + '] ' + e.text + ' ' + (e.url || ''))
    }
  })
  await ws.send('Runtime.enable'); await ws.send('Page.enable'); await ws.send('Log.enable')

  // 1) 打开首页；拿验证码 uuid -> 从 redis 取明文码 -> 登录（带验证码）
  await ws.send('Page.navigate', { url: ORIGIN + '/shop/home' }); await sleep(3500)
  const capRes = await ws.evalExpr(`(async()=>{try{const c=await (await fetch('/dev-api/captchaImage')).json();return c.uuid||('ERR:'+JSON.stringify(c))}catch(e){return 'EX:'+e.message}})()`, true)
  const uuid = (capRes.result && capRes.result.value) || ''
  let code = ''
  try {
    code = require('child_process').execSync('"D:/Redis/redis-cli.exe" GET captcha_codes:' + uuid, { encoding: 'utf8' }).trim().replace(/^"|"$/g, '')
  } catch (e) { console.log('取验证码失败:', e.message) }
  console.log('=== 验证码 ===', 'uuid=' + uuid.slice(0, 8) + '… code=' + code)
  const login = await ws.evalExpr(`(async()=>{try{const r=await fetch('/dev-api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123',code:'${code}',uuid:'${uuid}'})});const j=await r.json();return j.token||('ERR:'+JSON.stringify(j))}catch(e){return 'EX:'+e.message}})()`, true)
  const token = (login.result && login.result.value) || ''
  console.log('=== 登录 ===', token.startsWith('ey') ? 'OK (' + token.length + ')' : 'FAIL: ' + token)
  await ws.evalExpr(`document.cookie='Admin-Token=${token}; path=/;'`)

  // 2) 打开宠物粮页面
  await ws.send('Page.navigate', { url: ORIGIN + '/shop/food' }); await sleep(3200)
  const nCards = await ws.evalExpr(`document.querySelectorAll('.grid .card').length`)
  console.log('=== 商品卡片数 ===', nCards.result && nCards.result.value)

  // 3) 点开第 N 张卡片
  await ws.evalExpr(`(()=>{const c=document.querySelectorAll('.grid .card')[${CARD_IDX}];if(c)c.click()})()`)
  await sleep(3000)
  const d1 = await ws.evalExpr(`(()=>{const g=s=>document.querySelector(s);const btn=g('.like-btn');
    return {dialog:!!g('.food-detail-dialog'),name:((g('.detail-name')||{}).textContent||'').trim(),
      social:!!g('.pet-social'),likeNum:btn?(btn.querySelector('.num')||{}).textContent:null,
      liked:btn?btn.classList.contains('liked'):null,commentCnt:(g('.comment-area .cnt')||{}).textContent||'',
      editorBtn:((g('.editor-actions .el-button')||{}).textContent||'').trim(),
      items:document.querySelectorAll('.comment-area .list .item').length,
      empty:!!g('.comment-area .empty'),
      emptyTxt:((g('.comment-area .empty')||{}).textContent||'').trim(),
      imgBad:[...document.querySelectorAll('.food-detail-dialog img')].filter(i=>i.complete&&i.naturalWidth===0).length}})()`)
  console.log('=== 弹窗内容 ===', JSON.stringify(d1.result && d1.result.value))

  // 4) 点一次点赞，看计数是否变化
  await ws.evalExpr(`(()=>{const b=document.querySelector('.like-btn');if(b)b.click()})()`); await sleep(2600)
  const d2 = await ws.evalExpr(`(()=>{const btn=document.querySelector('.like-btn');const msgs=[...document.querySelectorAll('.el-message')].map(m=>m.textContent.trim());
    return {likeNum:btn?(btn.querySelector('.num')||{}).textContent:null,liked:btn?btn.classList.contains('liked'):null,msgs}})()`)
  console.log('=== 点赞后 ===', JSON.stringify(d2.result && d2.result.value))

  // 5) 再点一次取消点赞（还原）
  await ws.evalExpr(`(()=>{const b=document.querySelector('.like-btn');if(b)b.click()})()`); await sleep(2200)
  const d3 = await ws.evalExpr(`(()=>{const btn=document.querySelector('.like-btn');return {likeNum:btn?(btn.querySelector('.num')||{}).textContent:null,liked:btn?btn.classList.contains('liked'):null}})()`)
  console.log('=== 取消后 ===', JSON.stringify(d3.result && d3.result.value))

  // 6) 发一条评论并验证
  await ws.evalExpr(`(()=>{const ta=document.querySelector('.comment-area .editor textarea');if(!ta)return;const s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(ta,'CDP 自动测试评论');ta.dispatchEvent(new Event('input',{bubbles:true}))})()`)
  await sleep(700)
  await ws.evalExpr(`(()=>{const b=document.querySelector('.editor-actions .el-button');if(b)b.click()})()`)
  await sleep(2600)
  const d4 = await ws.evalExpr(`(()=>{const g=s=>document.querySelector(s);return {commentCnt:(g('.comment-area .cnt')||{}).textContent||'',items:document.querySelectorAll('.comment-area .list .item').length,first:((g('.comment-area .list .item .content')||{}).textContent||'').trim(),msgs:[...document.querySelectorAll('.el-message')].map(m=>m.textContent.trim())}})()`)
  console.log('=== 发评论后 ===', JSON.stringify(d4.result && d4.result.value))

  // 7) 删除刚才的测试评论（还原数据）
  await ws.evalExpr(`(()=>{const d=[...document.querySelectorAll('.comment-area .list .item .ops .el-link')].find(l=>l.textContent.includes('删除'));if(d)d.click()})()`)
  await sleep(1000)
  await ws.evalExpr(`(()=>{const b=document.querySelector('.el-message-box__btns .el-button--primary');if(b)b.click()})()`)
  await sleep(2200)
  const d5 = await ws.evalExpr(`(()=>({items:document.querySelectorAll('.comment-area .list .item').length,cnt:(document.querySelector('.comment-area .cnt')||{}).textContent||''}))()`)
  console.log('=== 删除测试评论后 ===', JSON.stringify(d5.result && d5.result.value))

  const newErr = errs.filter(e => !/favicon|Download the Vue Devtools|DevTools/i.test(e))
  console.log('=== 运行时错误 ===', newErr.length ? '' : '无')
  newErr.slice(0, 8).forEach(e => console.log('  ❗ ' + e))

  try { ws.sock.end() } catch (e) {}
  chrome.kill(); console.log('完成'); process.exit(0)
})().catch(e => { console.log('脚本异常:', e.message); process.exit(1) })
