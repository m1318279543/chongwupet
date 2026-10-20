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

    <section class="feature channels" v-if="svc.feature">
      <h2>{{ svc.feature.title }}</h2>
      <p class="sub">{{ svc.feature.intro }}</p>
      <div class="ch-grid">
        <div class="ch" v-for="(c, i) in svc.feature.channels" :key="i">
          <span class="ch-ico">{{ c.icon }}</span>
          <div class="ch-body">
            <div class="ch-top"><b>{{ c.name }}</b><span class="ch-cnt">在售 {{ c.count }} 只</span></div>
            <p>{{ c.desc }}</p>
          </div>
        </div>
      </div>
      <div class="tips">
        <h4>怎么读懂一宠一档</h4>
        <ul>
          <li v-for="(t, i) in svc.feature.tips" :key="i"><b>{{ t.k }}：</b>{{ t.v }}</li>
        </ul>
        <p class="note">{{ svc.feature.note }}</p>
      </div>
    </section>

    <section class="query-wrap">
      <h2>{{ svc.petTitle }}</h2>
      <p class="sub">{{ svc.petDesc }}</p>
      <ServicePetQuery section="origin" />
    </section>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import ServicePetQuery from './ServicePetQuery.vue'
import { SERVICES } from './serviceData'

const route = useRoute()
const slug = computed(() => route.params.slug || 'origin')
const svc = computed(() => SERVICES.find(s => s.slug === 'origin') || SERVICES[0])
watch(svc, (s) => { document.title = (s?.title || '服务保障') + ' - 宠物之家' }, { immediate: true })
</script>

<style scoped lang="scss">
@import './service-common.scss';
</style>
