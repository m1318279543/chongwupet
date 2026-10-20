import { reactive, toRefs } from 'vue'
import useDictStore from '@/store/modules/dict'
import { getDicts } from '@/api/system/dict/data'

/**
 * 获取字典数据
 */
export function useDict(...args) {
  const res = reactive({})
  return (() => {
    args.forEach((dictType, index) => {
      res[dictType] = []
      const dicts = useDictStore().getDict(dictType)
      if (dicts) {
        res[dictType] = dicts
      } else {
        getDicts(dictType).then(resp => {
          res[dictType] = resp.data.map(p => ({ label: p.dictLabel, value: p.dictValue, elTagType: p.listClass, elTagClass: p.cssClass }))
          useDictStore().setDict(dictType, res[dictType])
        })
      }
    })
    return toRefs(res)
  })()
}