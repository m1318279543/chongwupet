/** 取登录 token：captchaImage → redis 取码 → login；用法 node get_token.mjs [base] [user] [pass] [outfile] */
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:82'
const USER = process.argv[3] || 'ry'
const PASS = process.argv[4] || 'admin123'
const OUT = process.argv[5] || '.rytoken'
const cap = await (await fetch(BASE + '/dev-api/captchaImage')).json()
const uuid = cap.uuid
const raw = execSync(`"D:/Redis/redis-cli.exe" GET captcha_codes:${uuid}`, { encoding: 'utf8' }).trim()
const code = raw.replace(/^"|"$/g, '')
const r = await (await fetch(BASE + '/dev-api/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS, code, uuid })
})).json()
if (!r.token) { console.error('登录失败', JSON.stringify(r)); process.exit(1) }
fs.writeFileSync(OUT, r.token)
console.log(OUT, 'saved', r.token.slice(0, 16) + '...')
