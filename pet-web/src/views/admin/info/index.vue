<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="68px">
      <el-form-item label="宠物名称" prop="petName">
        <el-input v-model="queryParams.petName" placeholder="请输入宠物名称" clearable style="width: 200px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="状态" clearable style="width: 160px">
          <el-option label="在售" value="0" />
          <el-option label="已售" value="1" />
          <el-option label="下架" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="primary" plain icon="Plus" @click="handleAdd" v-hasPermi="['pet:info:add']">新增</el-button></el-col>
      <el-col :span="1.5"><el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:info:edit']">修改</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:info:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:info:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="infoList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="ID" align="center" prop="petId" width="70" />
      <el-table-column label="图片" align="center" width="90">
        <template #default="scope">
          <el-image v-if="scope.row.image" :src="scope.row.image" style="width: 50px; height: 50px" fit="cover" />
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="名称" align="center" prop="petName" :show-overflow-tooltip="true" />
      <el-table-column label="分类ID" align="center" prop="categoryId" width="80" />
      <el-table-column label="品种" align="center" prop="breed" :show-overflow-tooltip="true" />
      <el-table-column label="年龄" align="center" prop="age" width="80" />
      <el-table-column label="性别" align="center" prop="gender" width="70">
        <template #default="scope">{{ ['公','母','未知'][scope.row.gender] }}</template>
      </el-table-column>
      <el-table-column label="价格" align="center" prop="price" width="90">
        <template #default="scope">¥{{ scope.row.price }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status" width="80">
        <template #default="scope">
          <el-tag :type="scope.row.status==='0'?'success':scope.row.status==='1'?'info':'danger'">
            {{ ['在售','已售','下架'][scope.row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="160">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['pet:info:edit']">修改</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:info:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="infoRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="10">
          <el-col :span="12">
            <el-form-item label="分类ID" prop="categoryId">
              <el-input-number v-model="form.categoryId" controls-position="right" :min="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="宠物名称" prop="petName">
              <el-input v-model="form.petName" placeholder="如：旺财" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品种" prop="breed"><el-input v-model="form.breed" placeholder="如：金毛" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="年龄" prop="age"><el-input v-model="form.age" placeholder="如：2岁" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="0">公</el-radio>
                <el-radio value="1">母</el-radio>
                <el-radio value="2">未知</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价格" prop="price"><el-input-number v-model="form.price" :precision="2" :min="0" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="图片URL" prop="image"><el-input v-model="form.image" placeholder="图片地址" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="0">在售</el-radio>
                <el-radio value="1">已售</el-radio>
                <el-radio value="2">下架</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="描述" prop="description"><el-input v-model="form.description" type="textarea" placeholder="宠物描述" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" /></el-form-item>
          </el-col>
        </el-row>
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

<script setup name="Info">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetInfo, getPetInfo, delPetInfo, addPetInfo, updatePetInfo } from "@/api/pet/petInfo";

const { proxy } = getCurrentInstance();
const infoList = ref([]);
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
  queryParams: { pageNum: 1, pageSize: 10, petName: undefined, status: undefined },
  rules: { petName: [{ required: true, message: "宠物名称不能为空", trigger: "blur" }] },
});
const { queryParams, form, rules } = toRefs(data);

function getList() {
  loading.value = true;
  listPetInfo(queryParams.value).then((res) => { infoList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.petId); single.value = selection.length !== 1; multiple.value = !selection.length; }
function reset() {
  form.value = { petId: undefined, categoryId: undefined, petName: undefined, breed: undefined, age: undefined, gender: "0", price: 0, image: undefined, status: "0", description: undefined, remark: undefined };
  proxy.resetForm("infoRef");
}
function handleAdd() { reset(); open.value = true; title.value = "新增宠物信息"; }
function handleUpdate(row) {
  reset();
  const id = row.petId || ids.value;
  getPetInfo(id).then((res) => { form.value = res.data; open.value = true; title.value = "修改宠物信息"; });
}
function submitForm() {
  proxy.$refs["infoRef"].validate((valid) => {
    if (valid) {
      if (form.value.petId) { updatePetInfo(form.value).then(() => { proxy.$modal.msgSuccess("修改成功"); open.value = false; getList(); }); }
      else { addPetInfo(form.value).then(() => { proxy.$modal.msgSuccess("新增成功"); open.value = false; getList(); }); }
    }
  });
}
function handleDelete(row) {
  const ids = row.petId || ids.value;
  proxy.$modal.confirm('是否确认删除宠物ID为"' + ids + '"的数据项？').then(() => delPetInfo(ids)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/info/export", { ...queryParams.value }, `petInfo_${new Date().getTime()}.xlsx`); }
function cancel() { open.value = false; reset(); }
getList();
</script>
