<template>
  <div class="section-head">
    <div class="sh-text">
      <h2>{{ title }}</h2>
      <p v-if="desc">{{ desc }}</p>
    </div>
    <div v-if="$slots.extra" class="sh-extra"><slot name="extra" /></div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' }
})
</script>

<style scoped lang="scss">
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.sh-text {
  min-width: 0;

  h2 {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: -0.01em;
    color: var(--text-1);
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: var(--text-3);
  }
}

.sh-extra {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-3);
}
</style>
