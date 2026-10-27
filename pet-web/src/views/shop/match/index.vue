<template>
  <div class="match-page">
    <header class="m-head">
      <div class="mh-inner">
        <div class="mh-main">
          <p class="mh-eyebrow">Smart Match</p>
          <h1>智能选宠</h1>
          <p class="mh-sub">10 个条件 → 六维画像 → 与在售个体逐维扣分。评分只用规则引擎与站内行为，没有黑盒。</p>
        </div>
        <div class="mh-stats">
          <div><b>{{ candidateCount }}</b><span>在售个体</span></div>
          <div><b>{{ totalCount }}</b><span>道题 · 3 组</span></div>
          <div><b>8</b><span>只上限</span></div>
        </div>
      </div>
    </header>

    <div class="m-body">
      <!-- ================= 问卷 ================= -->
      <div v-show="!result && !loading" class="wz">
        <aside class="side">
          <div class="panel">
            <div class="panel-h">
              <b>你的画像</b><span>{{ doneCount }} / {{ totalCount }}</span>
            </div>
            <div class="pf">
              <div v-for="r in profileRows" :key="r.label">
                <span>{{ r.label }}</span>
                <b :class="{ none: !r.filled }">{{ r.filled ? r.value : '未选' }}</b>
              </div>
            </div>
            <div class="pbar"><i :style="{ width: progress + '%' }"></i></div>
          </div>
          <p class="side-note">画像与后端 Profile 一一对应：空间 / 运动 / 经验 / 陪伴 / 噪音 / 预算。</p>
        </aside>

        <section class="main">
          <div class="stepnav">
            <button
              v-for="(g, i) in STEPS"
              :key="g.key"
              type="button"
              :class="{ on: step === i, done: groupAll(g) }"
              @click="step = i"
            >
              <b>{{ pad(i + 1) }}</b><span>{{ g.title }}</span>
            </button>
          </div>

          <div class="card qcard">
            <div class="qgroup-h">
              <b>{{ curGroup.title }}</b><span>{{ curGroup.questions.length }} 题</span>
            </div>

            <div class="q-body">
              <div v-for="q in curGroup.questions" :key="q.key" class="q">
                <div class="qt">
                  <i>Q{{ qIndex[q.key] }}</i>{{ q.title }}
                  <span v-if="q.hint">{{ q.hint }}</span>
                </div>
                <div class="opts">
                  <button
                    v-for="o in q.options"
                    :key="o.value"
                    type="button"
                    class="opt"
                    :class="{ on: answers[q.key] === o.value }"
                    @click="answers[q.key] = o.value"
                  >
                    <b>{{ o.label }}</b>
                    <em v-if="o.desc">{{ o.desc }}</em>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="qfoot">
            <span class="tip">{{ curLeft ? `这一步还有 ${curLeft} 题未选` : '这一步已完成' }}</span>
            <button type="button" class="btn btn--ghost" :disabled="step === 0" @click="step--">上一步</button>
            <button type="button" class="btn btn--solid" @click="next">
              {{ step === STEPS.length - 1 ? '生成匹配结果' : '下一步' }}
            </button>
          </div>
        </section>
      </div>

      <!-- ================= 分析中 ================= -->
      <div v-if="loading" class="analyzing">
        <div class="spin"></div>
        <h3>正在比对在售个体</h3>
        <p>{{ analyzeText }}</p>
      </div>

      <!-- ================= 结果 ================= -->
      <div v-if="result && !loading" class="result">
        <!-- 无结果：按 diagnosis.rootCause 分三态 -->
        <template v-if="!recommendations.length">
          <div class="card empty">
            <div class="ico">!</div>

            <template v-if="diag && diag.rootCause === 'prefer'">
              <h3>「{{ preferName(diag.prefer) }}」目前没有在售个体</h3>
              <p class="cause">
                {{ diag.total }} 只在售个体里，有 <span class="num">{{ diag.byPrefer }}</span> 只被类型条件排除，剩下 0 只。
                换一个类型就能看到推荐。
              </p>
              <div class="acts">
                <button type="button" class="btn btn--solid" @click="loosenType">改成「不限」重算</button>
              </div>
            </template>

            <template v-else-if="diag && diag.rootCause === 'kids'">
              <h3>有小孩的前提下没有可选个体</h3>
              <p class="cause">
                类型筛选后剩 {{ diag.total - diag.byPrefer }} 只，其中
                <span class="num">{{ diag.byKids }}</span> 只没有标注「适合儿童」。
                建议联系客服了解性情温和的个体。
              </p>
              <div class="acts">
                <button type="button" class="btn btn--line" @click="goConsult">联系客服</button>
              </div>
            </template>

            <template v-else>
              <h3>预算内没有可选个体</h3>
              <p class="cause">
                符合其他条件的个体最低价约
                <span class="num">¥{{ fmt(diag && diag.lowestPrice) }}</span>，
                高于你的购宠预算 ¥{{ fmt(answers.budget) }}。
                <template v-if="diag && diag.byPrefer">你偏好的类型里没有更便宜的选择。</template>
              </p>
              <div class="acts">
                <button
                  v-if="diag && diag.lowestPrice"
                  type="button"
                  class="btn btn--solid"
                  @click="raiseBudget"
                >上调预算到 ¥{{ fmt(nextBudget) }}</button>
                <button type="button" class="btn btn--line" @click="goConsult">联系客服</button>
              </div>
            </template>
          </div>
          <p class="foot-note">本次测评已记录，会作为选品参考。</p>
        </template>

        <template v-else>
          <div class="card summary">
            <p>{{ result.summary }}</p>
            <p class="sub">
              共比对 {{ result.candidateCount }} 只在售个体 ·
              <template v-if="result.hasHistory">
                已登录，协同过滤生效（内容 72% + 相似用户 16% + 人气 12%）
              </template>
              <template v-else>
                游客模式，不含协同过滤（内容 84% + 人气 16%）
              </template>
            </p>
          </div>

          <div class="top card">
            <div class="top-img">
              <img v-if="isImg(top.image)" :src="top.image" :alt="top.petName" />
              <span v-else class="ph">{{ top.categoryName }} · 暂无实拍图</span>
              <span class="rk">TOP 1</span>
            </div>

            <div class="top-main">
              <div class="tp-row">
                <div class="tp-title">
                  <h3>
                    {{ top.petName }}
                    <span v-if="top.breed" class="ui-chip">{{ top.breed }}</span>
                  </h3>
                  <div class="tp-info">
                    {{ top.categoryName }}<template v-if="top.age"> · {{ top.age }}</template>
                    <template v-if="top.gender !== undefined"> · {{ genderText(top.gender) }}</template>
                  </div>
                  <div class="tp-price">
                    ¥{{ fmt(top.price) }}<em>月均 ¥{{ fmt(top.monthlyCost) }}</em>
                  </div>
                </div>
                <div class="tp-score">
                  <b>{{ top.score }}<i>%</i></b>
                  <span>{{ top.matchLevel }}</span>
                </div>
              </div>

              <div class="blk">
                <div class="blk-h"><b>匹配度是这么算的</b><span>权重合计 100%</span></div>

                <div class="srow">
                  <span class="n">内容契合</span>
                  <div class="bar"><i :style="{ width: (top.contentScore || 0) + '%' }"></i></div>
                  <span class="v">{{ top.contentScore }}</span>
                  <span class="w">{{ result.hasHistory ? 72 : 84 }}%</span>
                </div>

                <div class="srow" :class="{ muted: !result.hasHistory }">
                  <span class="n">相似用户</span>
                  <div class="bar"><i :style="{ width: (top.cfScore || 0) + '%' }"></i></div>
                  <span class="v">{{ result.hasHistory ? top.cfScore : '—' }}</span>
                  <span class="w">{{ result.hasHistory ? 16 : 0 }}%</span>
                </div>

                <div class="srow">
                  <span class="n">全站人气</span>
                  <div class="bar"><i :style="{ width: (top.popularityScore || 0) + '%' }"></i></div>
                  <span class="v">{{ top.popularityScore }}</span>
                  <span class="w">{{ result.hasHistory ? 12 : 16 }}%</span>
                </div>
              </div>

              <div class="blk">
                <div class="blk-h"><b>七维评分</b><span>六维画像 + 全站人气，共七项</span></div>
                <div class="dims">
                  <div
                    v-for="(v, k) in top.breakdown"
                    :key="k"
                    class="dim"
                    :class="{ low: v < 60 }"
                  >
                    <span class="dim-h"><span class="dl">{{ k }}</span><b>{{ v }}</b></span>
                    <div class="dbar"><i :style="{ width: Math.max(4, Math.min(100, v)) + '%' }"></i></div>
                  </div>
                </div>
              </div>

              <div class="two">
                <div class="tagbox good">
                  <b>适合你</b>
                  <div class="tags">
                    <span v-for="r in top.reasons || []" :key="r" class="tag">{{ r }}</span>
                    <span v-if="!(top.reasons || []).length" class="tag">综合维度接近画像</span>
                  </div>
                </div>
                <div class="tagbox warn">
                  <b>要注意</b>
                  <div class="tags">
                    <span v-for="c in top.cautions || []" :key="c" class="tag w">{{ c }}</span>
                    <span v-if="!(top.cautions || []).length" class="tag">暂无硬性风险项</span>
                  </div>
                </div>
              </div>

              <div class="tp-act">
                <button type="button" class="btn btn--solid" @click="goDetail(top.petId)">查看详情</button>
                <button type="button" class="btn btn--line" @click="fav(top)">收藏</button>
                <span class="act-note">收藏会进入协同过滤，影响下次推荐</span>
              </div>
            </div>
          </div>

          <template v-if="rest.length">
            <div class="rethead">
              <h2>其余 {{ rest.length }} 只（上限 8 只）</h2>
              <span>按综合分降序</span>
            </div>
            <div class="rlist">
              <div
                v-for="p in rest"
                :key="p.petId"
                class="rrow"
                @click="goDetail(p.petId)"
              >
                <span class="no">{{ pad(p.rank) }}</span>
                <span class="nm">
                  <b>{{ p.petName }}</b>
                  <span>{{ p.categoryName }} · {{ p.matchLevel }}</span>
                </span>
                <span class="why">{{ (p.reasons && p.reasons[0]) || '综合维度匹配' }}</span>
                <span class="pr">¥{{ fmt(p.price) }}</span>
                <span class="sc">{{ p.score }}%</span>
                <span class="go">查看 ›</span>
              </div>
            </div>
            <p class="foot-note">
              游客无协同过滤，因此「相似用户」一栏为 —。登录后同一套答案的排序会变。
            </p>
          </template>

          <div class="redo">
            <button type="button" class="btn btn--line" @click="reset">重新测评</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>


<script setup>
import { useMatchWizard } from './useMatchWizard'
// 页面逻辑全部在 useMatchWizard.js；这里只做装配。样式外链 style.scss（scoped 生效）。
const {
  loading, result, step, analyzeText, answers, STEPS,
  totalCount, doneCount, progress, allDone, curGroup, curLeft, qIndex, groupAll, profileRows,
  recommendations, top, rest, diag, candidateCount, nextBudget,
  next, submit, loosenType, raiseBudget, reset, goDetail, goConsult, fav,
  pad, fmt, isImg, genderText, preferName
} = useMatchWizard()
</script>

<style scoped lang="scss" src="./style.scss"></style>
