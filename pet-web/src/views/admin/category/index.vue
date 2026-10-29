<template>
  <div class="app-container">
    <!-- 搜索栏 -->
    <el-card shadow="never" class="ui-toolbar-card">
      <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="queryParams.categoryName" placeholder="请输入分类名称" clearable style="width: 240px" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="queryParams.status" placeholder="分类状态" clearable style="width: 200px">
            <el-option v-for="dict in pet_status" :key="dict.value" :label="dict.label" :value="dict.value" />
          </el-select>
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
            <el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:category:add']">新增</el-button>
            <el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:category:edit']">修改</el-button>
            <el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:category:remove']">删除</el-button>
            <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:category:export']">导出</el-button>
          </div>
          <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
        </div>
      </template>

      <!-- 表格 -->
      <el-table v-loading="loading" :data="categoryList" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="分类ID" align="center" prop="categoryId" width="100" />
      <el-table-column label="分类名称" align="center" prop="categoryName" :show-overflow-tooltip="true" />
      <el-table-column label="排序" align="center" prop="sort" width="100" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === '0' ? 'success' : 'danger'">
            {{ scope.row.status === '0' ? '正常' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="180">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['pet:category:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:category:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

      <div class="ui-pager">
        <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />
      </div>
    </el-card>

    <!-- 新增/修改对话框 -->
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="categoryRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="form.categoryName" placeholder="如：犬类、猫类、鸟类" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" controls-position="right" :min="0" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">正常</el-radio>
            <el-radio value="1">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Category">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listCategory, getCategory, delCategory, addCategory, updateCategory } from "@/api/pet/category";

const { proxy } = getCurrentInstance();
const { pet_status } = proxy.useDict("pet_status");

const categoryList = ref([]);
const loading = ref(true);
const showSearch = ref(true);
const ids = ref([]);
const single = ref(true);
const multiple = ref(true);
const total = ref(0);
const title = ref("");
const open = ref(false);

const data = reactive({
  form: {},
  queryParams: {
    pageNum: 1,
    pageSize: 10,
    categoryName: undefined,
    status: undefined,
  },
  rules: {
    categoryName: [{ required: true, message: "分类名称不能为空", trigger: "blur" }],
  },
});

const { queryParams, form, rules } = toRefs(data);

/** 查询列表 */
function getList() {
  loading.value = true;
  listCategory(queryParams.value).then((response) => {
    categoryList.value = response.rows;
    total.value = response.total;
    loading.value = false;
  });
}

/** 搜索 */
function handleQuery() {
  queryParams.value.pageNum = 1;
  getList();
}

/** 重置 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}

/** 多选 */
function handleSelectionChange(selection) {
  ids.value = selection.map((item) => item.categoryId);
  single.value = selection.length !== 1;
  multiple.value = !selection.length;
}

/** 新增 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = "新增宠物分类";
}

/** 修改 */
function handleUpdate(row) {
  reset();
  const id = row.categoryId || ids.value;
  getCategory(id).then((response) => {
    form.value = response.data;
    open.value = true;
    title.value = "修改宠物分类";
  });
}

/** 提交 */
function submitForm() {
  proxy.$refs["categoryRef"].validate((valid) => {
    if (valid) {
      if (form.value.categoryId) {
        updateCategory(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功");
          open.value = false;
          getList();
        });
      } else {
        addCategory(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功");
          open.value = false;
          getList();
        });
      }
    }
  });
}

/** 删除 */
function handleDelete(row) {
  const categoryIds = row.categoryId || ids.value;
  proxy.$modal.confirm('是否确认删除分类ID为"' + categoryIds + '"的数据项？').then(() => {
    return delCategory(categoryIds);
  }).then(() => {
    getList();
    proxy.$modal.msgSuccess("删除成功");
  }).catch(() => {});
}

/** 导出 */
function handleExport() {
  proxy.download("pet/category/export", { ...queryParams.value }, `category_${new Date().getTime()}.xlsx`);
}

/** 表单重置 */
function reset() {
  form.value = {
    categoryId: undefined,
    categoryName: undefined,
    sort: 0,
    status: "0",
    remark: undefined,
  };
  proxy.resetForm("categoryRef");
}

/** 取消 */
function cancel() {
  open.value = false;
  reset();
}

getList();
</script>

<style scoped lang="scss">
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
</style>
