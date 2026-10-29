// 校验：路由/菜单里用到的图标名是否都在 plugins/icons.js 的注册清单里
import fs from 'node:fs'

const reg = fs.readFileSync('pet-web/src/plugins/icons.js', 'utf8')
const has = (n) => new RegExp('\\b' + n + '\\b').test(reg)

const router = fs.readFileSync('pet-web/src/router/index.js', 'utf8')
const menu = fs.readFileSync('pet-web/src/layouts/admin/menu.js', 'utf8')
const pick = (src) => [...new Set([...src.matchAll(/icon:\s*'([A-Za-z]+)'/g)].map((m) => m[1]))]

const rIcons = pick(router)
const mIcons = pick(menu)
const missR = rIcons.filter((n) => !has(n))
const missM = mIcons.filter((n) => !has(n))
console.log(`路由图标 ${rIcons.length} 个，缺失: ${missR.length ? missR.join(',') : '无'}`)
console.log(`菜单分组图标 ${mIcons.length} 个，缺失: ${missM.length ? missM.join(',') : '无'}`)
if (missR.length || missM.length) process.exitCode = 1
