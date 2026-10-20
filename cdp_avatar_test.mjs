/**
 * 头像上传 UI 实测（CDP）
 * 覆盖：前台 /shop/profile、后台个人资料弹窗、后台用户管理编辑弹窗
 * 用法: node cdp_avatar_test.mjs [BASE]
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] || 'http://127.0.0.1:82'
const W = 1280, H = 900
const PORT = 9371
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const TOKEN = fs.existsSync('.admintoken') ? fs.readFileSync('.admintoken', 'utf8').trim() : ''
const IMG = path.resolve('test-avatar.png')

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-av-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  '--ignore-certificate-errors', `--window-size=${W},${H}`,
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

async function waitCdp() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return } catch { } await sleep(250) } throw new Error('CDP 未就绪') }
async function newTab() { for (const m of ['PUT', 'GET']) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: m }); if (r.ok) return await r.json() } catch { } } throw new Error('tab fail') }
const connect = (url) => new Promise((res, rej) => { const ws = new WebSocket(url); ws.addEventListener('open', () => res(ws)); ws.addEventListener('error', rej) })

;(async () => {
  await waitCdp()
  const tab = await newTab()
  const ws = await connect(tab.webSocketDebuggerUrl)
  let id = 0; const pending = new Map()
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise(res => { const mid = ++id; pending.set(mid, res); ws.send(JSON.stringify({ id: mid, method, params })) })
  const evaluate = async (e, byValue = true) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: byValue, awaitPromise: true }); return byValue ? r.result?.value : r.result }
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  await send('Network.setCookie', { name: 'Admin-Token', value: TOKEN, url: BASE + '/', path: '/' })

  let pass = 0, fail = 0
  const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + '  ' + (d ?? '')); c ? pass++ : fail++ }

  // 设置文件到 input[type=file]
  async function setFile(selector) {
    const r = await evaluate(`document.querySelector('${selector}')`, false)
    if (!r?.objectId) throw new Error('找不到文件输入框 ' + selector)
    await send('DOM.setFileInputFiles', { files: [IMG], objectId: r.objectId })
  }
  const shot = async (name) => {
    const s = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(name, Buffer.from(s.data, 'base64'))
  }

  // ============ 1. 前台个人资料 ============
  console.log('\n--- 前台 /shop/profile ---')
  await send('Page.navigate', { url: BASE + '/shop/profile' }); await sleep(4500)
  const before = await evaluate(`(() => {
    const img = document.querySelector('.avatar-img')
    return JSON.stringify({ hasImg: !!img, src: img?.getAttribute('src')||'', nat: img?.naturalWidth||0,
      store: JSON.parse(localStorage.getItem('vuex')||'{}') })
  })()`)
  console.log('  before:', before)
  check('前台资料页有上传输入框', !!(await evaluate(`!!document.querySelector('input[type=file]')`)), '')
  await setFile('input[type=file]')
  await sleep(3500)
  const after = await evaluate(`(() => {
    const img = document.querySelector('.avatar-img')
    return JSON.stringify({ hasImg: !!img, src: img?.getAttribute('src')||'', nat: img?.naturalWidth||0 })
  })()`)
  console.log('  after:', after)
  const af = JSON.parse(after || '{}')
  check('前台上传后头像图渲染成功', af.hasImg && af.nat > 0, `src=${af.src} natural=${af.nat}`)
  await shot('av-front-profile.png')

  // 接口侧确认
  const apiProfile = await evaluate(`fetch('/dev-api/system/user/profile',{headers:{Authorization:'Bearer ${TOKEN}'}}).then(r=>r.json()).then(j=>j.data?.avatar||'')`)
  check('前台上传已写入数据库', !!apiProfile, `avatar=${apiProfile}`)

  // ============ 2. 后台个人资料弹窗 ============
  console.log('\n--- 后台 /admin 个人资料弹窗 ---')
  await send('Page.navigate', { url: BASE + '/admin/dashboard' }); await sleep(4500)
  const opened = await evaluate(`(() => {
    const el = document.querySelector('.header .user'); if (!el) return 0; el.click(); return 1
  })()`)
  await sleep(800)
  const clicked = await evaluate(`(() => {
    const items = [...document.querySelectorAll('.el-dropdown-menu__item')]
    const t = items.find(i => i.textContent.includes('个人资料')); if (!t) return 0; t.click(); return 1
  })()`)
  await sleep(900)
  check('后台个人资料弹窗可打开', !!opened && !!clicked && await evaluate(`!!document.querySelector('.pf-dialog')`), '')
  const hasUpload = await evaluate(`!!document.querySelector('.el-dialog input[type=file]')`)
  check('后台个人资料有头像上传框', hasUpload, '')
  if (hasUpload) {
    await setFile('.el-dialog input[type=file]'); await sleep(3500)
    const a2 = await evaluate(`(() => { const img=document.querySelector('.pf-avatar-box img'); return JSON.stringify({src:img?.getAttribute('src')||'',nat:img?.naturalWidth||0}) })()`)
    const o2 = JSON.parse(a2 || '{}')
    check('后台上传后头像图渲染成功', o2.nat > 0, `src=${o2.src} natural=${o2.nat}`)
    await shot('av-admin-profile.png')
  }

  // ============ 3. 后台用户管理 ============
  console.log('\n--- 后台 /admin/system/user ---')
  await send('Page.navigate', { url: BASE + '/admin/system/user' }); await sleep(4500)
  const u = await evaluate(`(() => ({
    rows: document.querySelectorAll('.el-table__body tbody tr').length,
    hasAvatarCol: [...document.querySelectorAll('.el-table__header th')].some(th=>th.textContent.includes('头像')),
    hasEdit: !!document.querySelector('.el-table__body tbody tr .el-button')
  }))()`)
  console.log('  list:', JSON.stringify(u))
  check('用户列表可加载', u.rows > 0, `rows=${u.rows}`)
  check('用户列表有头像列', u.hasAvatarCol, '')
  // 打开某个普通用户的修改弹窗（优先找 ry）
  const picked = await evaluate(`(() => {
    const rows = [...document.querySelectorAll('.el-table__body tbody tr')]
    let target = rows.find(r => /(^|\\s)ry(\\s|$)/.test((r.textContent||'').trim()))
    if (!target) target = rows[1] || rows[0]
    if (!target) return ''
    const btn = [...target.querySelectorAll('.el-button')].find(b => b.textContent.includes('修改'))
    if (!btn) return ''
    btn.click()
    return (target.textContent || '').slice(0, 50)
  })()`)
  await sleep(1800)
  const dlg = await evaluate(`(() => ({
    open: !!document.querySelector('.el-dialog'),
    hasAvatar: !!document.querySelector('.el-dialog input[type=file]'),
    title: document.querySelector('.el-dialog__title')?.textContent || ''
  }))()`)
  console.log('  dialog:', JSON.stringify(dlg), 'picked=', picked)
  check('用户修改弹窗可打开', !!dlg.open, dlg.title)
  check('用户修改弹窗支持上传头像', !!dlg.hasAvatar, '')

  if (dlg.hasAvatar) {
    await setFile('.el-dialog input[type=file]')
    await sleep(3500)
    const av = JSON.parse(await evaluate(`(() => {
      const img = document.querySelector('.av-box img')
      return JSON.stringify({ has: !!img, src: img?.getAttribute('src') || '', nat: img?.naturalWidth || 0 })
    })()`) || '{}')
    console.log('  upload preview:', JSON.stringify(av))
    check('后台上传目标用户头像成功', av.nat > 0, `src=${av.src} natural=${av.nat}`)
    await shot('av-admin-user-edit.png')

    // 关闭弹窗（取消）
    await evaluate(`(() => { const b=[...document.querySelectorAll('.el-dialog__footer .el-button')].find(x=>x.textContent.trim()==='取 消'||x.textContent.trim()==='取消'); if(b) b.click(); return 1 })()`)
    await sleep(900)
    // 列表行头像即时刷新（定位到刚编辑的用户行）
    const rowAv = JSON.parse(await evaluate(`(() => {
      const rows = [...document.querySelectorAll('.el-table__body tbody tr')]
      const target = rows.find(r => /(^|\\s)ry(\\s|$)/.test((r.textContent||'').trim())) || rows[1]
      const img = target?.querySelector('.row-av img')
      return JSON.stringify({ has: !!img, nat: img?.naturalWidth || 0, src: img?.getAttribute('src') || '' })
    })()`) || '{}')
    check('列表头像即时显示（目标用户行）', rowAv.nat > 0 && av.src && rowAv.src === av.src, `src=${rowAv.src} 期望=${av.src}`)
  }

  // ============ 4. 后台改完 → 前台同步 ============
  console.log('\n--- 跨端同步 ---')
  const ryTokFile = '.tok_ry'
  if (fs.existsSync(ryTokFile)) {
    const ryTok = fs.readFileSync(ryTokFile, 'utf8').trim()
    await send('Network.setCookie', { name: 'Admin-Token', value: ryTok, url: BASE + '/', path: '/' })
    await send('Page.navigate', { url: BASE + '/shop/profile' }); await sleep(4500)
    const sync = JSON.parse(await evaluate(`(() => {
      const img = document.querySelector('.avatar-img')
      return JSON.stringify({ src: img?.getAttribute('src') || '', nat: img?.naturalWidth || 0 })
    })()`) || '{}')
    check('前台资料页显示后台设置的头像', sync.nat > 0, `src=${sync.src}`)
    await shot('av-front-synced.png')

    await send('Page.navigate', { url: BASE + '/shop/home' }); await sleep(4200)
    const hdr = JSON.parse(await evaluate(`(() => {
      const img = document.querySelector('.desk-user .avatar img') || document.querySelector('.desk-user img')
      return JSON.stringify({ has: !!img, nat: img?.naturalWidth || 0 })
    })()`) || '{}')
    check('前台顶栏头像已同步', hdr.nat > 0, `natural=${hdr.nat}`)
  } else {
    console.log('  跳过跨端同步：无 .tok_ry')
  }

  console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
  ws.close(); chrome.kill(); setTimeout(() => process.exit(fail ? 1 : 0), 300)
})().catch(e => { console.error('FAILED: ' + e.message); chrome.kill(); process.exit(1) })
