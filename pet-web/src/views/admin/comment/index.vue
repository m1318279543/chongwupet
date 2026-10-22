<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="宠物ID" prop="petId">
        <el-input v-model="queryParams.petId" placeholder="宠物ID" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="内容" prop="content">
        <el-input v-model="queryParams.content" placeholder="评论关键词" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="正常" value="0" />
          <el-option label="已隐藏" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:comment:remove']">删除</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="commentList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="评论ID" align="center" prop="commentId" width="80" />
      <el-table-column label="宠物" align="center" width="180">
        <template #default="scope">
          <div class="pet-cell">
            <img v-if="scope.row.image && scope.row.image.indexOf('/') === 0" :src="scope.row.image" class="pet-img" />
            <span v-else class="pet-emoji">🐾</span>
            <span>{{ scope.row.petName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="评论用户" align="center" prop="userName" width="120" />
      <el-table-column label="评论内容" align="center" prop="content" :show-overflow-tooltip="true" min-width="200">
        <template #default="scope">
          <span class="reply-tag" v-if="scope.row.parentId > 0">回复 @{{ scope.row.replyUser || '原评论' }}：</span>{{ scope.row.content }}
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="100">
        <template #default="scope">
          <el-switch v-model="scope.row.status" active-value="0" inactive-value="1"
            @change="handleStatusChange(scope.row)" />
        </template>
      </el-table-column>
      <el-table-column label="评论时间" align="center" prop="createTime" width="180">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="120">
        <template #default="scope">
          <el-button link type="success" @click="goFront(scope.row)">前台查看</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:comment:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
  </div>
</template>

<script setup name="PetComment">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetCommentManage, updatePetComment, delPetCommentBatch } from "@/api/pet/petComment";

const { proxy } = getCurrentInstance();
const commentList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const multiple = ref(true);
const total = ref(0);

const data = reactive({
  queryParams: { pageNum: 1, pageSize: 10, petId: undefined, content: undefined, status: undefined },
});
const { queryParams } = toRefs(data);

function getList() {
  loading.value = true;
  listPetCommentManage(queryParams.value).then((res) => { commentList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.commentId); multiple.value = !selection.length; }
// 跳转前台宠物详情页，查看该评论所在的评论区
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank'); }

/** 显示/隐藏切换 */
function handleStatusChange(row) {
  const text = row.status === "0" ? "显示" : "隐藏";
  proxy.$modal.confirm('确认要' + text + '评论ID为"' + row.commentId + '"的评论吗？').then(() => {
    return updatePetComment({ commentId: row.commentId, status: row.status });
  }).then(() => {
    proxy.$modal.msgSuccess(text + "成功");
  }).catch(() => {
    row.status = row.status === "0" ? "1" : "0";   // 取消则回滚
  });
}

function handleDelete(row) {
  const delIds = row.commentId || ids.value;
  proxy.$modal.confirm('是否确认删除评论ID为"' + delIds + '"的数据项？').then(() => delPetCommentBatch(delIds)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
getList();
</script>

<style scoped>
.pet-cell { display: flex; align-items: center; justify-content: center; gap: 8px; }
.pet-img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
.pet-emoji { font-size: 24px; }
.reply-tag { color: var(--brand-500); }
</style>
