<template>
  <div class="app-container">
    <el-card shadow="never" class="ui-toolbar-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
        <el-form-item label="用户ID" prop="userId">
          <el-input v-model="queryParams.userId" placeholder="用户ID" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="宠物ID" prop="petId">
          <el-input v-model="queryParams.petId" placeholder="宠物ID" clearable style="width: 160px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="ui-card-head">
          <div class="head-actions">
            <el-radio-group v-model="queryParams.target" size="default" @change="handleQuery">
              <el-radio-button value="favorite">收藏记录</el-radio-button>
              <el-radio-button value="like">点赞记录</el-radio-button>
            </el-radio-group>
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="[removePermi]">删除</el-button>
            <el-button v-if="queryParams.target === 'favorite'" type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:favorite:export']">导出</el-button>
          </div>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </div>
      </template>

      <el-table v-loading="loading" :data="recordList" border stripe>
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="记录ID" align="center" prop="recordId" width="90" />
      <el-table-column label="宠物" align="center" width="220">
        <template #default="scope">
          <div class="ui-pet-cell">
            <img v-if="scope.row.image && scope.row.image.indexOf('/') === 0" :src="scope.row.image" class="ui-pet-cell__img" alt="宠物图片" />
            <span v-else class="ui-pet-cell__emoji">🐾</span>
            <span>{{ scope.row.petName || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="互动用户" align="center" prop="userName" width="140" />
      <el-table-column label="用户ID" align="center" prop="userId" width="100" />
      <el-table-column label="宠物ID" align="center" prop="petId" width="100" />
      <el-table-column :label="targetLabel" align="center" prop="createTime" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="150">
        <template #default="scope">
          <el-button link type="success" @click="goFront(scope.row)">前台查看</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="[removePermi]">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

      <div class="ui-pager">
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </el-card>
  </div>
</template>

<script setup name="Interaction">
import { ref, reactive, toRefs, getCurrentInstance, computed } from "vue";
import { listPetFavorite, delPetFavorite } from "@/api/pet/petFavorite";
import { listPetLike, delPetLike } from "@/api/pet/petLike";

// 收藏与点赞原先是两个 90% 重复的管理页，合并为「互动记录」：
// 用 target 切换数据源，列结构、查询条件、分页、删除逻辑完全共用。
// 后端仍是两张表（收藏与点赞语义不同，不合并数据），这里只合并管理界面。
const TARGETS = {
  favorite: { label: "收藏时间", idKey: "favoriteId", removePermi: "pet:favorite:remove" },
  like: { label: "点赞时间", idKey: "likeId", removePermi: "pet:like:remove" },
};

const { proxy } = getCurrentInstance();
const recordList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const multiple = ref(true);
const total = ref(0);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, target: "favorite", userId: undefined, petId: undefined },
});
const { queryParams } = toRefs(data);

const targetLabel = computed(() => TARGETS[queryParams.target].label);
const removePermi = computed(() => TARGETS[queryParams.target].removePermi);

function getList() {
  loading.value = true;
  const { target, ...params } = queryParams.value;
  const req = target === "like" ? listPetLike(params) : listPetFavorite(params);
  req.then((res) => {
    const idKey = TARGETS[target].idKey;
    recordList.value = (res.rows || []).map((r) => ({ ...r, recordId: r[idKey] }));
    total.value = res.total || 0;
    loading.value = false;
  }).catch(() => { loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
// 跳转前台宠物详情页，查看该宠物的点赞与评论区
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank'); }
function handleSelectionChange(selection) { ids.value = selection.map((i) => i.recordId); multiple.value = !selection.length; }
function handleDelete(row) {
  const delIds = row.recordId || ids.value;
  const isLike = queryParams.target === "like";
  proxy.$modal.confirm(`是否确认删除${isLike ? "点赞" : "收藏"}ID为"${delIds}"的数据项？`)
    .then(() => (isLike ? delPetLike(delIds) : delPetFavorite(delIds)))
    .then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); })
    .catch(() => {});
}
function handleExport() { proxy.download("pet/favorite/export", { ...queryParams.value }, `favorite_${new Date().getTime()}.xlsx`); }
getList();
</script>

<style scoped lang="scss">
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
</style>
