/** 后台为指定用户上传头像 + 资料同步（含在线会话即时刷新） */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const REMOTE = BASE.includes('47.116.73.25')
function login(user, pass) {
  execSync(`node ${REMOTE ? 'remote_token.mjs' : 'get_token.mjs'} ${BASE} ${user} ${pass} .tok_${user}`, { encoding: 'utf8' })
  return fs.readFileSync(`.tok_${user}`, 'utf8').trim()
}
const admin = login('admin', 'admin123')
const ry = login('ry', 'admin123')
const AH = { Authorization: 'Bearer ' + admin }
const JH = { Authorization: 'Bearer ' + ry }
const get = async (h, p) => (await fetch(BASE + '/dev-api' + p, { headers: h })).json()

let pass = 0, fail = 0
const check = (n, c, d) => { console.log((c ? 'PASS' : 'FAIL') + '  ' + n + '  ' + (d ?? '')); c ? pass++ : fail++ }

const info = await get(JH, '/getInfo')
const uid = info.user.userId
console.log('ry userId=', uid, 'avatar=', info.user.avatar)

// ry 当前 token 的缓存快照（不刷新）
const avatarBefore = info.user.avatar

// 1. 管理员给 ry 上传头像
const buf = fs.readFileSync('test-avatar.png')
const fd = new FormData()
fd.append('userId', String(uid))
fd.append('avatarfile', new Blob([buf], { type: 'image/png' }), 'admin-set.png')
let r = await fetch(BASE + '/dev-api/system/user/avatar', { method: 'POST', headers: AH, body: fd })
let j = await r.json()
console.log('admin 上传:', r.status, JSON.stringify(j))
check('管理员为用户上传头像接口成功', j.code === 200 && !!j.imgUrl, `imgUrl=${j.imgUrl}`)
const newAvatar = j.imgUrl

// 2. 图片可访问
const abs = BASE + '/dev-api' + newAvatar
r = await fetch(abs)
check('新头像图片可访问', r.status === 200 && (r.headers.get('content-type') || '').startsWith('image/'), `${r.status} ${abs}`)

// 3. 目标用户在线会话立即刷新（未重新登录、未调用 getInfo 前缓存已更新）
const info2 = await get(JH, '/getInfo')
check('目标用户 getInfo 立即拿到新头像', info2.user.avatar === newAvatar && newAvatar !== avatarBefore, `avatar=${info2.user.avatar}`)

// 4. 目标用户 profile 也是新头像
const p2 = await get(JH, '/system/user/profile')
check('目标用户 profile 同步头像', p2.data.avatar === newAvatar, `avatar=${p2.data.avatar}`)

// 5. 管理员修改 ry 昵称/手机 → 目标用户即时同步
const newNick = '同步' + Date.now().toString().slice(-4)
const payload = {
  userId: uid, userName: info2.user.userName, nickName: newNick,
  phonenumber: info2.user.phonenumber, email: info2.user.email, sex: info2.user.sex,
  status: info2.user.status, deptId: info2.user.deptId,
  roleIds: (info2.user.roles || []).map(x => x.roleId), postIds: [],
  avatar: newAvatar
}
r = await fetch(BASE + '/dev-api/system/user', { method: 'PUT', headers: { ...AH, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
j = await r.json()
check('管理员修改用户资料成功', j.code === 200, JSON.stringify(j))

const info3 = await get(JH, '/getInfo')
const p3 = await get(JH, '/system/user/profile')
check('改昵称后 getInfo 同步', info3.user.nickName === newNick, `nick=${info3.user.nickName}`)
check('改昵称后 profile 同步', p3.data.nickName === newNick, `nick=${p3.data.nickName}`)
check('头像未被资料修改覆盖', info3.user.avatar === newAvatar, `avatar=${info3.user.avatar}`)

// 还原昵称
payload.nickName = info2.user.nickName
await fetch(BASE + '/dev-api/system/user', { method: 'PUT', headers: { ...AH, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
console.log('已还原昵称')

console.log(`\n结果: ${pass} PASS / ${fail} FAIL`)
process.exit(fail ? 1 : 0)
