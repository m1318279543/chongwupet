import axios from 'axios'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { saveAs } from 'file-saver'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { tansParams, blobValidate } from '@/utils/ruoyi'

// 是否显示重新登录
export let isRelogin = { show: false }

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'

const service = axios.create({
  baseURL: '/dev-api',
  timeout: 10000
})

// request 拦截器
// 按用户 store 的区域（shop/admin）取对应 token。
// 关键：路由守卫在「切区」（如商城 → /admin）时 pathname 还是旧区域，
// 若按 location 判断会带错凭证；store.scope 在 ensureScope 里已先行切换，才是权威来源。
import { useUserStore } from '@/store/modules/user'
function scopeToken() {
  try {
    const store = useUserStore()
    if (store && store.scope) return getToken(store.scope)
  } catch (e) { /* pinia 未初始化时（如登录页首屏）按路径判断 */ }
  return getToken()
}

service.interceptors.request.use(config => {
  const isToken = (config.headers || {}).isToken === false
  const token = scopeToken()
  if (token && !isToken) {
    config.headers['Authorization'] = 'Bearer ' + token
  }
  // get 请求 params 拼到 url
  if (config.method === 'get' && config.params) {
    let url = config.url + '?' + tansParams(config.params)
    url = url.slice(0, -1)
    config.params = {}
    config.url = url
  }
  return config
}, error => {
  console.log(error)
  Promise.reject(error)
})

// response 拦截器
service.interceptors.response.use(res => {
  const code = res.data.code || 200
  const msg = errorCode[code] || res.data.msg || errorCode['default']
  // 二进制直接返回
  if (res.request.responseType === 'blob' || res.request.responseType === 'arraybuffer') {
    return res.data
  }
  if (code === 401) {
    if (!isRelogin.show) {
      isRelogin.show = true
      ElMessageBox.confirm('登录状态已过期，您可以继续留在该页面，或者重新登录', '系统提示', {
        confirmButtonText: '重新登录',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        isRelogin.show = false
        // 动态 import 避免循环依赖
        import('@/store/modules/user').then(({ default: useUserStore }) => {
          useUserStore().logOut().then(() => {
            // 后台区域过期回后台登录页，前台回商城登录页
            location.href = location.pathname.startsWith('/admin') ? '/admin/login' : '/login'
          })
        })
      }).catch(() => {
        isRelogin.show = false
      })
    }
    return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
  } else if (code === 500) {
    ElMessage({ message: msg, type: 'error' })
    return Promise.reject(new Error(msg))
  } else if (code !== 200) {
    ElMessage({ message: msg, type: 'error' })
    return Promise.reject(new Error(msg))
  } else {
    return Promise.resolve(res.data)
  }
}, error => {
  console.log('err' + error)
  let { message } = error
  if (message == 'Network Error') {
    message = '后端接口连接异常'
  } else if (message.includes('timeout')) {
    message = '系统接口请求超时'
  } else if (message.includes('Request failed with status code')) {
    message = '系统接口' + message.slice(-3) + '异常'
  }
  ElMessage({ message, type: 'error', duration: 5000 })
  return Promise.reject(error)
})

// 通用下载方法（导出 Excel 等）
let downloadLoadingInstance
export function download(url, params, filename, config) {
  downloadLoadingInstance = ElLoading.service({ text: "正在下载数据，请稍候", background: "rgba(0, 0, 0, 0.7)" })
  return service.post(url, params, {
    transformRequest: [(params) => { return tansParams(params) }],
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    responseType: 'blob',
    ...config
  }).then(async (data) => {
    if (blobValidate(data)) {
      const blob = new Blob([data])
      saveAs(blob, filename)
    } else {
      const resText = await data.text()
      const rspObj = JSON.parse(resText)
      const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
      ElMessage.error(errMsg)
    }
    downloadLoadingInstance.close()
  }).catch((r) => {
    console.error(r)
    ElMessage.error('下载文件出现错误，请联系管理员！')
    downloadLoadingInstance.close()
  })
}

export default service
