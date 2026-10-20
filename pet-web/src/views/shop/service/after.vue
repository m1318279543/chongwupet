<template>
  <div class="service-page">
    <section class="hero">
      <h1>{{ svc.icon }} {{ svc.title }}</h1>
      <p class="slogan">{{ svc.slogan }}</p>
      <nav class="svc-nav">
        <router-link v-for="s in SERVICES" :key="s.slug" :to="'/shop/service/' + s.slug"
          class="svc-item" :class="{ active: s.slug === slug }">
          <span class="icon">{{ s.icon }}</span><span>{{ s.title }}</span>
        </router-link>
      </nav>
    </section>

    <section class="promise">
      <div class="card" v-for="(p, i) in svc.points" :key="i">
        <span class="p-icon">{{ p.icon }}</span>
        <h3>{{ p.title }}</h3>
        <p>{{ p.desc }}</p>
      </div>
    </section>

    <section class="flow">
      <h2>{{ svc.flowTitle }}</h2>
      <div class="steps">
        <div class="step" v-for="(s, i) in svc.flow" :key="i">
          <span class="no">{{ i + 1 }}</span><span class="txt">{{ s }}</span>
        </div>
      </div>
    </section>

    <section class="feature policy" v-if="svc.feature">
      <h2>{{ svc.feature.title }}</h2>
      <div class="pol-grid">
        <div class="pol" v-for="(g, i) in svc.feature.guarantees" :key="i">
          <span class="pol-ico">{{ g.icon }}</span>
          <div><b>{{ g.t }}</b><p>{{ g.d }}</p></div>
        </div>
      </div>
      <h3 class="dl-title">{{ svc.feature.deliveryTitle }}</h3>
      <div class="dl-grid">
        <div class="dl" v-for="(d, i) in svc.feature.delivery" :key="i">
          <span class="dl-ico">{{ d.icon }}</span>
          <div><b>{{ d.t }}</b><p>{{ d.d }}</p></div>
        </div>
      </div>
    </section>

    <!-- 常见问题 FAQ -->
    <section class="faq" v-if="svc.faqs && svc.faqs.length">
      <h2>❓ 常见问题</h2>
      <p class="sub">关于售后保障，您最关心的问题都在这里</p>
      <el-collapse v-model="activeFaq" class="faq-collapse">
        <el-collapse-item v-for="(item, i) in svc.faqs" :key="i" :name="i">
          <template #title><span class="faq-q">{{ item.q }}</span></template>
          <p class="faq-a">{{ item.a }}</p>
        </el-collapse-item>
      </el-collapse>
    </section>

    <!-- 联系售后顾问 -->
    <section class="contact" v-if="svc.contact">
      <div class="contact-card">
        <div class="contact-left">
          <h2>📞 联系售后顾问</h2>
          <p class="contact-note">{{ svc.contact.note }}</p>
          <ul class="contact-list">
            <li>
              <span class="c-ico">☎️</span>
              <div>
                <b>售后热线</b><br />
                <a :href="'tel:' + svc.contact.hotline" class="c-val tel-link">{{ svc.contact.hotline }}</a>
                <span class="c-sub">（{{ svc.contact.hotlineHours }}）</span>
              </div>
            </li>
            <li>
              <span class="c-ico">💬</span>
              <div>
                <b>售后微信</b><br />
                <span class="c-val">{{ svc.contact.wechat }}</span>
                <span class="c-sub">（添加时备注宠物档案编号）</span>
              </div>
            </li>
          </ul>
        </div>
        <div class="contact-right">
          <p class="cr-tip">购宠不是结束，<br />而是陪伴的开始 🐾</p>
          <el-button type="primary" size="large" round @click="goConsult">💬 立即在线咨询</el-button>
          <el-button size="large" round @click="callHotline">📞 拨打售后热线</el-button>
        </div>
      </div>
    </section>

    <section class="query-wrap">
      <h2>{{ svc.petTitle }}</h2>
      <p class="sub">{{ svc.petDesc }}</p>
      <ServicePetQuery section="after" />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServicePetQuery from './ServicePetQuery.vue'
import { SERVICES } from './serviceData'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug || 'after')
const svc = computed(() => SERVICES.find(s => s.slug === 'after') || SERVICES[0])
const activeFaq = ref([])
watch(svc, (s) => { document.title = (s?.title || '服务保障') + ' - 宠物之家' }, { immediate: true })

function goConsult() {
  const path = (svc.value.contact && svc.value.contact.consultPath) || '/shop/consult'
  router.push(path)
}
function callHotline() {
  const tel = svc.value.contact && svc.value.contact.hotline
  if (tel) window.location.href = 'tel:' + tel
}
</script>

<style scoped lang="scss">
@import './service-common.scss';

// 常见问题 FAQ（蓝色主题，与售后无忧一致）
.faq { margin-top: 24px;
  h2 { margin: 0 0 6px; font-size: 22px; color: #303133; }
  .sub { color: #909399; margin: 0 0 14px; font-size: 13px; }
  .faq-collapse { border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,.05); border: none;
    :deep(.el-collapse-item__header) { padding: 0 20px; font-size: 15px; font-weight: 600; color: #303133; height: 52px;
      &:hover { color: #3a6ad6; } }
    :deep(.el-collapse-item__wrap) { border-bottom: none; }
    :deep(.el-collapse-item__content) { padding: 4px 20px 16px; }
    .faq-q { display: flex; align-items: center; gap: 8px; }
    .faq-a { margin: 0; color: #606266; font-size: 14px; line-height: 1.85; }
  }
}

// 联系售后顾问
.contact { margin-top: 24px;
  .contact-card { display: flex; flex-wrap: wrap; gap: 22px; align-items: stretch;
    background: linear-gradient(135deg, #4a7ff0 0%, #3a6ad6 100%); border-radius: 16px; padding: 28px 30px; color: #fff;
    box-shadow: 0 8px 24px rgba(58,106,214,.25); }
  .contact-left { flex: 1 1 320px;
    h2 { margin: 0 0 8px; font-size: 20px; color: #fff; }
    .contact-note { margin: 0 0 16px; font-size: 13px; opacity: .92; line-height: 1.7; }
    .contact-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px;
      li { display: flex; gap: 12px; align-items: flex-start;
        .c-ico { font-size: 24px; flex: 0 0 auto; line-height: 1.2; }
        b { font-size: 15px; color: #fff; }
        .c-val { font-size: 15px; font-weight: 700; color: #fff;
          &.tel-link { text-decoration: none; border-bottom: 1px dashed rgba(255,255,255,.6); } }
        .c-sub { display: block; font-size: 12px; opacity: .82; margin-top: 2px; }
      }
    }
  }
  .contact-right { flex: 0 0 280px; background: rgba(255,255,255,.96); border-radius: 14px; padding: 22px 20px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center;
    .cr-tip { margin: 0; font-size: 16px; font-weight: 700; color: #3a6ad6; line-height: 1.6; }
    .el-button { width: 100%; }
  }
}

@media (max-width: 640px) {
  .contact .contact-right { flex-basis: 100%; }
}
</style>
