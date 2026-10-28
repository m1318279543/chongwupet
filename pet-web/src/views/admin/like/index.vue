<template>
  <div class="app-container">
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

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:like:remove']">删除</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="likeList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="点赞ID" align="center" prop="likeId" width="80" />
      <el-table-column label="宠物" align="center" width="220">
        <template #default="scope">
          <div class="pet-cell">
            <img v-if="scope.row.image && scope.row.image.indexOf('/') === 0" :src="scope.row.image" class="pet-img" alt="宠物图片" />
            <span v-else class="pet-emoji">—</span>
            <span>{{ scope.row.petName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="点赞用户" align="center" prop="userName" width="140" />
      <el-table-column label="用户ID" align="center" prop="userId" width="100" />
      <el-table-column label="宠物ID" align="center" prop="petId" width="100" />
      <el-table-column label="点赞时间" align="center" prop="createTime" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="120">
        <template #default="scope">
          <el-button link type="success" @click="goFront(scope.row)">前台查看</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:like:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="PetLike">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetLike, delPetLike } from "@/api/pet/petLike";

const { proxy } = getCurrentInstance();
const likeList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const multiple = ref(true);
const total = ref(0);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, userId: undefined, petId: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listPetLike(queryParams.value).then((res) => { likeList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
// 跳转前台宠物详情页，查看该宠物的点赞与评论区
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank'); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.likeId); multiple.value = !selection.length; }
function handleDelete(row) {
  const delIds = row.likeId || ids.value;
  proxy.$modal.confirm('是否确认删除点赞ID为"' + delIds + '"的数据项？').then(() => delPetLike(delIds)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
getList();
</script>

<style scoped>
.pet-cell { display: flex; align-items: center; justify-content: center; gap: 8px; }
.pet-img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.pet-emoji { font-size: 24px; }
</style>
