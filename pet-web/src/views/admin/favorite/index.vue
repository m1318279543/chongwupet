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
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:favorite:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:favorite:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="favoriteList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="收藏ID" align="center" prop="favoriteId" width="80" />
      <el-table-column label="用户ID" align="center" prop="userId" width="100" />
      <el-table-column label="宠物ID" align="center" prop="petId" width="100" />
      <el-table-column label="用户名" align="center" prop="userName" width="110" />
      <el-table-column label="宠物名称" align="center" prop="petName" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="收藏时间" align="center" prop="createTime" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="收藏人" align="center" prop="createBy" width="120" />
      <el-table-column label="操作" align="center" width="120">
        <template #default="scope">
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:favorite:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="Favorite">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetFavorite, delPetFavorite } from "@/api/pet/petFavorite";

const { proxy } = getCurrentInstance();
const favoriteList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, userId: undefined, petId: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listPetFavorite(queryParams.value).then((res) => { favoriteList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.favoriteId); single.value = selection.length !== 1; multiple.value = !selection.length; }
function handleDelete(row) {
  const ids = row.favoriteId || ids.value;
  proxy.$modal.confirm('是否确认删除收藏ID为"' + ids + '"的数据项？').then(() => delPetFavorite(ids)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/favorite/export", { ...queryParams.value }, `favorite_${new Date().getTime()}.xlsx`); }
getList();
</script>
