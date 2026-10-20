<template>
  <div>
    <el-upload
      :action="uploadUrl"
      :before-upload="handleBeforeUpload"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
      name="file"
      :show-file-list="false"
      :headers="headers"
      class="editor-img-uploader"
      v-if="type === 'url'"
    >
      <i ref="uploadRef" class="editor-img-uploader"></i>
    </el-upload>
  </div>
  <div class="editor">
    <quill-editor
      ref="quillEditorRef"
      v-model:content="content"
      contentType="html"
      @textChange="() => emit('update:modelValue', content)"
      :options="options"
      :style="styles"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, toRaw, getCurrentInstance } from 'vue'
import axios from 'axios'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { getToken } from '@/utils/auth'

const { proxy } = getCurrentInstance()
const emit = defineEmits(['update:modelValue'])

const quillEditorRef = ref()
const uploadUrl = ref((import.meta.env.VITE_APP_BASE_API || '/dev-api') + '/common/upload')
const headers = ref({ Authorization: 'Bearer ' + getToken() })

const props = defineProps({
  modelValue: { type: String },
  height: { type: Number, default: null },
  minHeight: { type: Number, default: null },
  readOnly: { type: Boolean, default: false },
  fileSize: { type: Number, default: 5 },
  type: { type: String, default: 'url' }
})

const options = ref({
  theme: 'snow',
  bounds: document.body,
  debug: 'warn',
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  },
  placeholder: '请输入内容',
  readOnly: props.readOnly
})

const styles = computed(() => {
  const style = {}
  if (props.minHeight) style.minHeight = `${props.minHeight}px`
  if (props.height) style.height = `${props.height}px`
  return style
})

const content = ref('')
watch(() => props.modelValue, (v) => {
  if (v !== content.value) {
    content.value = v === undefined ? '<p></p>' : v
  }
}, { immediate: true })

onMounted(() => {
  if (props.type === 'url') {
    const quill = quillEditorRef.value.getQuill()
    const toolbar = quill.getModule('toolbar')
    toolbar.addHandler('image', (value) => {
      if (value) {
        proxy.$refs.uploadRef.click()
      } else {
        quill.format('image', false)
      }
    })
    quill.root.addEventListener('paste', handlePasteCapture, true)
  }
})

function handleBeforeUpload(file) {
  const type = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg']
  if (!type.includes(file.type)) {
    proxy.$modal.msgError('图片格式错误!')
    return false
  }
  if (props.fileSize) {
    const isLt = file.size / 1024 / 1024 < props.fileSize
    if (!isLt) {
      proxy.$modal.msgError(`上传文件大小不能超过 ${props.fileSize} MB!`)
      return false
    }
  }
  return true
}

function handleUploadSuccess(res) {
  if (res.code === 200) {
    const quill = toRaw(quillEditorRef.value).getQuill()
    const length = quill.selection.savedRange.index
    quill.insertEmbed(length, 'image', (import.meta.env.VITE_APP_BASE_API || '/dev-api') + res.fileName)
    quill.setSelection(length + 1)
  } else {
    proxy.$modal.msgError('图片插入失败')
  }
}

function handleUploadError() {
  proxy.$modal.msgError('图片插入失败')
}

function handlePasteCapture(e) {
  const clipboard = e.clipboardData || window.clipboardData
  if (clipboard && clipboard.items) {
    for (let i = 0; i < clipboard.items.length; i++) {
      const item = clipboard.items[i]
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        insertImage(item.getAsFile())
      }
    }
  }
}

function insertImage(file) {
  const formData = new FormData()
  formData.append('file', file)
  axios.post(uploadUrl.value, formData, {
    headers: { 'Content-Type': 'multipart/form-data', Authorization: headers.value.Authorization }
  }).then((res) => {
    handleUploadSuccess(res.data)
  })
}
</script>

<style>
.editor-img-uploader {
  display: none;
}
.editor,
.ql-toolbar {
  white-space: pre-wrap !important;
  line-height: normal !important;
}
.quill-img {
  display: none;
}
.ql-snow .ql-tooltip[data-mode="link"]::before {
  content: "请输入链接地址:";
}
.ql-snow .ql-tooltip.ql-editing a.ql-action::after {
  border-right: 0px;
  content: "保存";
  padding-right: 0px;
}
.ql-snow .ql-tooltip[data-mode="video"]::before {
  content: "请输入视频地址:";
}
.ql-snow .ql-picker.ql-size .ql-picker-label::before,
.ql-snow .ql-picker.ql-size .ql-picker-item::before {
  content: "14px";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
  content: "10px";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
  content: "18px";
}
.ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before,
.ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
  content: "32px";
}
.ql-snow .ql-picker.ql-header .ql-picker-label::before,
.ql-snow .ql-picker.ql-header .ql-picker-item::before {
  content: "文本";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
  content: "标题1";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
  content: "标题2";
}
.ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
.ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
  content: "标题3";
}
</style>
