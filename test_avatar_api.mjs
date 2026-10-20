/** 头像接口联调：上传 → 读回 → 静态访问 → getInfo */
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const TOKEN = fs.readFileSync(process.argv[3] || '.admintoken', 'utf8').trim()
const auth = { Authorization: 'Bearer ' + TOKEN }

// 1. 当前资料
let r = await fetch(BASE + '/dev-api/system/user/profile', { headers: auth })
let j = await r.json()
console.log('profile:', j.code, 'avatar=', j.data?.avatar, 'nick=', j.data?.nickName)

// 2. 上传头像
const buf = fs.readFileSync('test-avatar.png')
const fd = new FormData()
fd.append('avatarfile', new Blob([buf], { type: 'image/png' }), 'test-avatar.png')
r = await fetch(BASE + '/dev-api/system/user/profile/avatar', { method: 'POST', headers: auth, body: fd })
j = await r.json()
console.log('upload:', r.status, JSON.stringify(j))
const imgUrl = j.imgUrl
if (!imgUrl) process.exit(1)

// 3. 静态访问
const abs = imgUrl.startsWith('http') ? imgUrl : BASE + '/dev-api' + (imgUrl.startsWith('/') ? imgUrl : '/' + imgUrl)
r = await fetch(abs)
console.log('fetch img:', r.status, r.headers.get('content-type'), (await r.arrayBuffer()).byteLength, 'bytes')
console.log('img url:', abs)

// 4. getInfo 是否带新头像
r = await fetch(BASE + '/dev-api/getInfo', { headers: auth })
j = await r.json()
console.log('getInfo:', j.code, 'avatar=', j.user?.avatar, 'nick=', j.user?.nickName)
