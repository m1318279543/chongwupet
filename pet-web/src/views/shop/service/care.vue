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

    <section class="feature care" v-if="svc.feature">
      <h2>{{ svc.feature.title }}</h2>
      <p class="sub">{{ svc.feature.intro }}</p>
      <div class="cat-cards">
        <div class="cc" v-for="(c, i) in svc.feature.cats" :key="i">
          <div class="cc-head"><span class="cc-emoji">{{ c.emoji }}</span><b>{{ c.name }}</b></div>
          <ul>
            <li v-for="(p, j) in c.points" :key="j">{{ p }}</li>
          </ul>
        </div>
      </div>
      <div class="checklist">
        <h4>{{ svc.feature.checklistTitle }}</h4>
        <div class="cl-grid">
          <span class="cl" v-for="(x, i) in svc.feature.checklist" :key="i">✓ {{ x }}</span>
        </div>
      </div>
    </section>

    <section class="query-wrap">
      <h2>{{ svc.petTitle }}</h2>
      <p class="sub">{{ svc.petDesc }}</p>
      <ServicePetQuery section="care" />
    </section>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import ServicePetQuery from './ServicePetQuery.vue'
import { SERVICES } from './serviceData'

const route = useRoute()
const slug = computed(() => route.params.slug || 'care')
const svc = computed(() => SERVICES.find(s => s.slug === 'care') || SERVICES[0])
watch(svc, (s) => { document.title = (s?.title || '服务保障') + ' - 宠物之家' }, { immediate: true })
</script>

<style scoped lang="scss">
@import './service-common.scss';
</style>
