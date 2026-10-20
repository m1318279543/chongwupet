import { useUserStore } from '@/store/modules/user'

// 校验权限
export function hasPermi(value) {
  if (value && value instanceof Array && value.length > 0) {
    const permissions = useUserStore().permissions
    const all_permission = '*:*:*'
    return permissions.some(p => all_permission === p || value.includes(p))
  }
  return false
}

// 校验角色
export function hasRole(value) {
  if (value && value instanceof Array && value.length > 0) {
    const roles = useUserStore().roles
    const super_admin = 'admin'
    return roles.some(r => super_admin === r || value.includes(r))
  }
  return false
}

// 注册全局指令 v-hasPermi / v-hasRole
export default function setupDirectives(app) {
  app.directive('hasPermi', {
    mounted(el, binding) {
      const { value } = binding
      if (value && value instanceof Array && value.length > 0) {
        if (!hasPermi(value)) {
          el.parentNode && el.parentNode.removeChild(el)
        }
      } else {
        throw new Error(`需要配置权限标识，如: v-hasPermi="['pet:info:add']"`)
      }
    }
  })
  app.directive('hasRole', {
    mounted(el, binding) {
      const { value } = binding
      if (value && value instanceof Array && value.length > 0) {
        if (!hasRole(value)) {
          el.parentNode && el.parentNode.removeChild(el)
        }
      } else {
        throw new Error(`需要配置角色标识，如: v-hasRole="['admin']"`)
      }
    }
  })
}
