import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import { ElLoadingDirective } from 'element-plus'
import './styles/tokens.scss'
import './styles/element.scss'
import './styles/index.scss'
// 极简排版基元（.ui-*）：只新增类名，不覆盖既有样式
import './styles/flat.scss'
import App from './App.vue'
import router from './router'
import setupDirectives from './permission'
// 图标按需注册：只注册项目实际用到的图标（全量注册会把 293 个图标全部打包）
import setupIcons from './plugins/icons'

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

// 按需注册 Element Plus 图标（清单见 src/plugins/icons.js）
setupIcons(app)

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

// v-loading 指令按需注册（组件本身由 unplugin 按需引入，见 vite.config.js）
app.directive('loading', ElLoadingDirective)
setupDirectives(app)

app.mount('#app')
