/** 远程服务器取登录 token：验证码走 ssh_run.py 读远程 Redis */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
const BASE = process.argv[2] || 'http://47.116.73.25'
const USER = process.argv[3] || 'ry', PASS = process.argv[4] || 'admin123', OUT = process.argv[5] || '.rytoken'
const cap = await (await fetch(BASE + '/dev-api/captchaImage')).json()
const raw = execSync(`python deploy/ssh_run.py "redis-cli GET captcha_codes:${cap.uuid}"`, { encoding: 'utf8' }).trim()
const code = raw.replace(/^"|"$/g, '').split('\n').pop().trim()
const r = await (await fetch(BASE + '/dev-api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: USER, password: PASS, code, uuid: cap.uuid }) })).json()
if (!r.token) { console.error('登录失败', JSON.stringify(r)); process.exit(1) }
fs.writeFileSync(OUT, r.token); console.log(OUT, 'saved')
