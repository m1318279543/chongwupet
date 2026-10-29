<template>
  <div class="ui-page">
    <header class="ui-head">
      <div class="ui-head__main">
        <p class="ui-eyebrow">My Pets</p>
        <h1 class="ui-title">我的宠物</h1>
        <p class="ui-sub">名下宠物的疫苗、驱虫记录都汇总在这里，服务工单与评价可在「我的预约」查看。</p>
      </div>
      <div class="ui-head__aside" v-if="list.length">
        <span class="ui-count"><b>{{ list.length }}</b>只宠物</span>
      </div>
    </header>

    <p v-if="!userStore.token" class="mp-note">
      当前为游客浏览，
      <button type="button" class="ui-linkbtn" @click="openAuth('login')">登录</button>
      后可查看名下宠物档案。
    </p>

    <section class="mp-body" v-loading="loading">
      <div class="ui-box" v-if="list.length">
        <div class="ui-box__body">
          <ul class="ui-list">
            <li v-for="pet in pagedList" :key="pet.petId" class="ui-row mp-row">
              <div class="ui-thumb">
                <img v-if="isImage(pet.image)" :src="pet.image" :alt="pet.petName" loading="lazy" />
                <span v-else class="ui-thumb__ph">暂无图</span>
              </div>

              <div class="ui-row__main">
                <div class="ui-row__title">
                  {{ pet.petName }}
                  <span class="ui-chip ui-chip--brand">{{ pet.breed || '品种待补' }}</span>
                  <span v-if="pet.age" class="mp-age">{{ pet.age }}</span>
                </div>

                <div class="ui-row__meta">
                  <span class="meta-item">
                    <el-icon><FirstAidKit /></el-icon>{{ vaccineText(pet) }}
                  </span>
                  <span class="meta-item">
                    <el-icon><Clock /></el-icon>{{ dewormText(pet) }}
                  </span>
                </div>
              </div>

              <div class="ui-row__end">
                <button type="button" class="ui-btn ui-btn--line ui-btn--sm" @click="askCare(pet)">
                  问管家
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div class="ui-box__foot" v-if="list.length > PAGE_SIZE">
          <span class="ui-box__count">第 {{ rangeStart }}–{{ rangeEnd }} 条 / 共 {{ list.length }} 条</span>
          <Pagination
            v-model:page="page"
            :total="list.length"
            :limit="PAGE_SIZE"
            :page-sizes="[PAGE_SIZE]"
            :background="false"
            layout="prev, pager, next"
            :auto-scroll="false"
          />
        </div>
      </div>

      <div v-else-if="!loading" class="ui-empty">
        <span class="ui-empty__ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="8" cy="8.5" r="1.7"/><circle cx="12" cy="6.5" r="1.7"/><circle cx="16" cy="8.5" r="1.7"/><path d="M12 11c2.8 0 5 2 5 4.4 0 1.6-1.3 2.6-2.7 2.3-.8-.2-1.5-.3-2.3-.3s-1.5.1-2.3.3C8.3 18 7 17 7 15.4 7 13 9.2 11 12 11z"/></svg>
        </span>
        <p class="ui-empty__title">还没有宠物档案</p>
        <p class="ui-empty__desc">
          在门店完成购买或建档后，宠物会出现在这里，疫苗、驱虫和服务记录也会同步。
        </p>
        <div class="ui-empty__act">
          <button type="button" class="ui-btn ui-btn--solid" @click="$router.push('/shop/pets')">去看宠物</button>
          <button type="button" class="ui-btn ui-btn--line" @click="$router.push('/shop/consult')">联系客服建档</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, FirstAidKit } from '@element-plus/icons-vue'
import { myPets } from '@/api/pet/petCustomer'
import { getPetHealth } from '@/api/pet/petHealth'
import { useUserStore } from '@/store/modules/user'
import Pagination from '@/components/Pagination/index.vue'
import { useClientPaging } from '@/composables/usePagedList'
import { isImage } from '@/utils/petDisplay'

const userStore = useUserStore()
const openAuth = inject('openAuth', () => {})

const loading = ref(false)
const list = ref([])
const healthMap = ref({})

const PAGE_SIZE = 6
const { page, paged: pagedList, rangeStart, rangeEnd } = useClientPaging(list, PAGE_SIZE)

async function loadData() {
  if (!userStore.token) {
    list.value = []
    return
  }
  loading.value = true
  try {
    const res = await myPets()
    list.value = res.data || []
    loadHealth(list.value)
  } catch (e) {
    list.value = []
    ElMessage.error(e?.msg || '宠物档案加载失败')
  } finally {
    loading.value = false
  }
}

// 健康档案逐个补：只取当前页 + 少量缓冲，避免名下宠物多时打满请求
function loadHealth(pets) {
  pets.forEach((pet, index) => {
    if (index >= 18) return
    getPetHealth(pet.petId)
      .then((res) => {
        if (res.data) healthMap.value[pet.petId] = res.data
      })
      .catch(() => {})
  })
}

function fmtDate(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(0, 10)
}

function daysSince(value) {
  if (!value) return null
  const time = new Date(String(value).replace('T', ' ').replace(/-/g, '/')).getTime()
  if (Number.isNaN(time)) return null
  return Math.floor((Date.now() - time) / 86400000)
}

function vaccineText(pet) {
  const health = healthMap.value[pet.petId]
  if (!health || !health.vaccineDate) return '疫苗记录待补'
  return '疫苗 ' + fmtDate(health.vaccineDate)
}

function dewormText(pet) {
  const health = healthMap.value[pet.petId]
  if (!health || !health.dewormDate) return '驱虫记录待补'
  const days = daysSince(health.dewormDate)
  if (days !== null && days > 90) return '驱虫已超期 ' + (days - 90) + ' 天'
  return '驱虫 ' + fmtDate(health.dewormDate)
}

function askCare(pet) {
  window.dispatchEvent(new CustomEvent('pet-assistant-open', {
    detail: {
      scene: 'mypet',
      petId: pet.petId,
      bizId: String(pet.petId),
      message: `${pet.petName}的疫苗和驱虫什么时候到期？喂养上要注意什么？`
    }
  }))
}

onMounted(loadData)
watch(() => userStore.token, loadData)
</script>

<style scoped lang="scss">
.mp-note {
  margin: 0 0 14px;
  padding-left: 10px;
  border-left: 2px solid var(--brand-300);
  font-size: var(--fs-3);
  line-height: 1.7;
  color: var(--text-3);
}
.mp-row { align-items: center; }
.mp-age {
  font-size: var(--fs-2);
  color: var(--text-3);
  font-weight: 400;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
