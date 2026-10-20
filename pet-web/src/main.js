import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import locale from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import setupDirectives from './permission'
import './styles/index.scss'

// ---- RuoYi 能力对齐：后台管理复用 RuoYi 的组件与全局工具 ----
import { useDict } from '@/utils/dict'
import { download } from '@/utils/request'
import { parseTime, resetForm, addDateRange, handleTree, selectDictLabel, selectDictLabels } from '@/utils/ruoyi'
import Pagination from '@/components/Pagination/index.vue'
import RightToolbar from '@/components/RightToolbar/index.vue'
import DictTag from '@/components/DictTag/index.vue'
import modal from '@/plugins/modal'
import downloadPlugin from '@/plugins/download'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册所有 Element Plus 图标为全局组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局组件（与 RuoYi 保持一致）
app.component('Pagination', Pagination)
app.component('RightToolbar', RightToolbar)
app.component('DictTag', DictTag)

// 全局方法（与 RuoYi 保持一致）
app.config.globalProperties.useDict = useDict
app.config.globalProperties.download = download
app.config.globalProperties.parseTime = parseTime
app.config.globalProperties.resetForm = resetForm
app.config.globalProperties.handleTree = handleTree
app.config.globalProperties.addDateRange = addDateRange
app.config.globalProperties.selectDictLabel = selectDictLabel
app.config.globalProperties.selectDictLabels = selectDictLabels
app.config.globalProperties.$modal = modal
app.config.globalProperties.$download = downloadPlugin

app.use(ElementPlus, { locale })
setupDirectives(app)

app.mount('#app')
