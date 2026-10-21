import { defineStore } from 'pinia'
import { login, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken, isAdminPath } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    // 当前所在区域：shop 前台 / admin 后台。两者使用各自的 Cookie，互不覆盖
    scope: isAdminPath() ? 'admin' : 'shop',
    token: getToken(),
    userId: '',
    userName: '',
    nickName: '',
    avatar: '',
    roles: [],
    permissions: []
  }),
  actions: {
    /**
     * 切换前台/后台区域：清空内存里的用户态，改用该区域自己的 token。
     * 同一个标签页从后台点「前往前台」时，不会把 admin 身份带到前台。
     */
    ensureScope(scope) {
      if (this.scope === scope) return false
      this.scope = scope
      this.resetState()
      this.token = getToken(scope)
      return true
    },
    // 登录（token 写入当前区域的 Cookie）
    login(userInfo) {
      const { username, password, code, uuid } = userInfo
      return new Promise((resolve, reject) => {
        login(username.trim(), password, code, uuid).then(res => {
          setToken(res.token, this.scope)
          this.token = res.token
          resolve()
        }).catch(error => {
          reject(error)
        })
      })
    },
    // 获取用户信息
    getInfo() {
      return new Promise((resolve, reject) => {
        getInfo().then(res => {
          const user = res.user
          if (user) {
            this.userId = user.userId
            this.userName = user.userName
            this.nickName = user.nickName
            this.avatar = user.avatar
          }
          if (res.roles && res.roles.length > 0) {
            this.roles = res.roles
            this.permissions = res.permissions
          } else {
            this.roles = ['ROLE_DEFAULT']
          }
          resolve(res)
        }).catch(error => {
          reject(error)
        })
      })
    },
    // 退出（只退出当前区域，不影响另一端已登录的账号）
    logOut() {
      return new Promise((resolve) => {
        logout().then(() => {
          this.clearSession()
          resolve()
        }).catch(() => {
          this.clearSession()
          resolve()
        })
      })
    },
    // 只清内存状态
    resetState() {
      this.token = ''
      this.userId = ''
      this.userName = ''
      this.nickName = ''
      this.avatar = ''
      this.roles = []
      this.permissions = []
    },
    // 清内存状态 + 当前区域的 Cookie
    clearSession() {
      removeToken(this.scope)
      this.resetState()
    }
  }
})

export default useUserStore
