<template>
  <span class="bot" :class="{ 'is-talking': talking, 'is-mini': mini }" aria-hidden="true">
    <i class="bot-halo"></i>
    <svg class="bot-face" viewBox="0 0 48 48">
      <!-- 耳朵 -->
      <path class="ear" d="M10.5 16.5 L8.2 6.4 L18.6 12.4 Z" />
      <path class="ear" d="M37.5 16.5 L39.8 6.4 L29.4 12.4 Z" />
      <!-- 脸 -->
      <circle class="face" cx="24" cy="26" r="14" />
      <!-- 眼睛（眨眼） -->
      <ellipse class="eye" cx="19" cy="24" rx="2.1" ry="2.6" />
      <ellipse class="eye" cx="29" cy="24" rx="2.1" ry="2.6" />
      <!-- 高光 -->
      <circle class="glint" cx="19.7" cy="23.2" r=".7" />
      <circle class="glint" cx="29.7" cy="23.2" r=".7" />
      <!-- 鼻子 + 嘴 -->
      <path class="nose" d="M22.6 27.4 h2.8 l-1.4 1.6 Z" />
      <path class="mouth" d="M20.6 30.2 Q24 33.2 27.4 30.2" />
      <!-- 腮红 -->
      <circle class="blush" cx="15.2" cy="28.6" r="2.1" />
      <circle class="blush" cx="32.8" cy="28.6" r="2.1" />
    </svg>
    <i class="bot-wave"><b></b><b></b><b></b></i>
  </span>
</template>

<script setup>
defineProps({
  /** 说话/思考中：光环加速、声波跳动 */
  talking: { type: Boolean, default: false },
  /** 小尺寸（消息头像） */
  mini: { type: Boolean, default: false }
})
</script>

<style scoped lang="scss">
.bot {
  position: relative; display: inline-grid; place-items: center;
  width: 100%; height: 100%;
}

/* 呼吸光环：两层错峰扩散，像数字人在待机呼吸 */
.bot-halo {
  position: absolute; inset: -4px; border-radius: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, .28), transparent 68%);
  animation: bot-breathe 3.2s ease-in-out infinite;
  pointer-events: none;
}
.is-talking .bot-halo { animation-duration: 1.1s; }

.bot-face {
  position: relative; width: 100%; height: 100%;
  filter: drop-shadow(0 2px 6px rgba(79, 70, 229, .28));

  .ear { fill: #c7d2fe; stroke: #6366f1; stroke-width: 1.6; stroke-linejoin: round; }
  .face { fill: #eef2ff; stroke: #6366f1; stroke-width: 1.8; }
  .eye { fill: #312e81; transform-box: fill-box; transform-origin: center; animation: bot-blink 4.6s infinite; }
  .glint { fill: #fff; opacity: .9; }
  .nose { fill: #f9a8d4; }
  .mouth { fill: none; stroke: #6366f1; stroke-width: 1.6; stroke-linecap: round; }
  .blush { fill: #fbcfe8; opacity: .85; }
}
.is-talking .bot-face .mouth { animation: bot-talk .5s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }

/* 眨眼：快速压扁再睁开，间隔较长，避免电子宠物既视感 */
@keyframes bot-blink {
  0%, 92%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(.12); }
  97% { transform: scaleY(1); }
}
@keyframes bot-breathe {
  0%, 100% { transform: scale(.92); opacity: .55; }
  50% { transform: scale(1.12); opacity: 1; }
}
@keyframes bot-talk {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(.45); }
}

/* 说话声波：三根竖条，默认隐藏，仅在 talking 时出现 */
.bot-wave {
  position: absolute; right: -16px; bottom: 4px;
  display: none; align-items: flex-end; gap: 2px; height: 12px;
  b {
    width: 3px; border-radius: 2px; background: #6366f1;
    animation: bot-bar .9s ease-in-out infinite;
  }
  b:nth-child(1) { height: 6px; animation-delay: 0s; }
  b:nth-child(2) { height: 11px; animation-delay: .15s; }
  b:nth-child(3) { height: 8px; animation-delay: .3s; }
}
.is-talking .bot-wave { display: inline-flex; }
.is-mini .bot-wave { display: none !important; }
.is-mini .bot-halo { display: none; }
@keyframes bot-bar {
  0%, 100% { transform: scaleY(.45); }
  50% { transform: scaleY(1); }
}
</style>
