import { defineStore } from 'pinia'
import { login, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userId: '',
    userName: '',
    nickName: '',
    avatar: '',
    roles: [],
    permissions: []
  }),
  actions: {
    // 登录
    login(userInfo) {
      const { username, password, code, uuid } = userInfo
      return new Promise((resolve, reject) => {
        login(username.trim(), password, code, uuid).then(res => {
          setToken(res.token)
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
    // 退出
    logOut() {
      return new Promise((resolve) => {
        logout().then(() => {
          this.resetState()
          resolve()
        }).catch(() => {
          this.resetState()
          resolve()
        })
      })
    },
    // 重置状态
    resetState() {
      this.token = ''
      this.userId = ''
      this.userName = ''
      this.nickName = ''
      this.avatar = ''
      this.roles = []
      this.permissions = []
      removeToken()
    }
  }
})

export default useUserStore
