/** 验证后台改资料 → 前台同步（含 /system/user/profile 是否读缓存） */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const REMOTE = BASE.includes('47.116.73.25')

function login(user, pass) {
  const out = REMOTE
    ? execSync(`node remote_token.mjs ${BASE} ${user} ${pass} .tok_${user}`, { encoding: 'utf8' })
    : execSync(`node get_token.mjs ${BASE} ${user} ${pass} .tok_${user}`, { encoding: 'utf8' })
  return fs.readFileSync(`.tok_${user}`, 'utf8').trim()
}
const H = (t) => ({ Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' })

const admin = login('admin', 'admin123')
const ry = login('ry', 'admin123')

const g = async (t, path) => (await fetch(BASE + '/dev-api' + path, { headers: { Authorization: 'Bearer ' + t } })).json()

const before = await g(ry, '/system/user/profile')
const beforeInfo = await g(ry, '/getInfo')
console.log('ry 原昵称 profile=', before.data?.nickName, 'getInfo=', beforeInfo.user?.nickName)

const uid = beforeInfo.user.userId
const newNick = '同步测试' + Date.now().toString().slice(-4)
let r = await fetch(BASE + '/dev-api/system/user', { method: 'PUT', headers: H(admin), body: JSON.stringify({ userId: uid, userName: beforeInfo.user.userName, nickName: newNick, phonenumber: beforeInfo.user.phonenumber, email: beforeInfo.user.email, sex: beforeInfo.user.sex, status: beforeInfo.user.status, deptId: beforeInfo.user.deptId, roleIds: (beforeInfo.user.roles||[]).map(r=>r.roleId), postIds: [] }) })
console.log('admin 修改:', JSON.stringify(await r.json()))

const afterProfile = await g(ry, '/system/user/profile')
const afterInfo = await g(ry, '/getInfo')
console.log('改后 ry profile=', afterProfile.data?.nickName, '(期望', newNick + ')')
console.log('改后 ry getInfo=', afterInfo.user?.nickName, '(期望', newNick + ')')
console.log(afterProfile.data?.nickName === newNick ? 'PASS profile 同步' : 'FAIL profile 仍读缓存')
console.log(afterInfo.user?.nickName === newNick ? 'PASS getInfo 同步' : 'FAIL getInfo 未同步')

// 还原
await fetch(BASE + '/dev-api/system/user', { method: 'PUT', headers: H(admin), body: JSON.stringify({ userId: uid, userName: beforeInfo.user.userName, nickName: beforeInfo.user.nickName, phonenumber: beforeInfo.user.phonenumber, email: beforeInfo.user.email, sex: beforeInfo.user.sex, status: beforeInfo.user.status, deptId: beforeInfo.user.deptId, roleIds: (beforeInfo.user.roles||[]).map(r=>r.roleId), postIds: [] }) })
console.log('已还原昵称')
