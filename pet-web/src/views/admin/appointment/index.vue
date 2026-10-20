<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" v-show="showSearch" label-width="80px">
      <el-form-item label="用户ID" prop="userId">
        <el-input v-model="queryParams.userId" placeholder="用户ID" clearable style="width: 160px" @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="预约状态" clearable style="width: 160px">
          <el-option label="待处理" value="0" />
          <el-option label="已确认" value="1" />
          <el-option label="已完成" value="2" />
          <el-option label="已取消" value="3" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5"><el-button type="success" plain icon="Edit" :disabled="single" @click="handleUpdate" v-hasPermi="['pet:appointment:edit']">处理</el-button></el-col>
      <el-col :span="1.5"><el-button type="danger" plain icon="Delete" :disabled="multiple" @click="handleDelete" v-hasPermi="['pet:appointment:remove']">删除</el-button></el-col>
      <el-col :span="1.5"><el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['pet:appointment:export']">导出</el-button></el-col>
      <right-toolbar v-model:showSearch="showSearch" @queryTable="getList"></right-toolbar>
    </el-row>

    <el-table v-loading="loading" :data="appointmentList" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="55" align="center" />
      <el-table-column label="预约ID" align="center" prop="appointmentId" width="80" />
      <el-table-column label="用户ID" align="center" prop="userId" width="80" />
      <el-table-column label="宠物ID" align="center" prop="petId" width="80" />
      <el-table-column label="用户名" align="center" prop="userName" width="110" />
      <el-table-column label="宠物名称" align="center" prop="petName" width="130" :show-overflow-tooltip="true" />
      <el-table-column label="预约日期" align="center" prop="appointmentDate" width="120">
        <template #default="scope"><span>{{ parseTime(scope.row.appointmentDate, '{y}-{m}-{d}') }}</span></template>
      </el-table-column>
      <el-table-column label="联系电话" align="center" prop="contactPhone" width="130" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="['warning','primary','success','info'][scope.row.status]">
            {{ ['待处理','已确认','已完成','已取消'][scope.row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="160">
        <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
      <el-table-column label="操作" align="center" width="160">
        <template #default="scope">
          <el-button link type="primary" icon="Edit" @click="handleUpdate(scope.row)" v-hasPermi="['pet:appointment:edit']">处理</el-button>
          <el-button link type="primary" icon="Delete" @click="handleDelete(scope.row)" v-hasPermi="['pet:appointment:remove']">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize" @pagination="getList" />

    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="apptRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户ID" prop="userId"><el-input-number v-model="form.userId" controls-position="right" :min="0" :disabled="!!form.appointmentId" /></el-form-item>
        <el-form-item label="宠物ID" prop="petId"><el-input-number v-model="form.petId" controls-position="right" :min="0" :disabled="!!form.appointmentId" /></el-form-item>
        <el-form-item label="预约日期" prop="appointmentDate">
          <el-date-picker v-model="form.appointmentDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
        </el-form-item>
        <el-form-item label="联系电话" prop="contactPhone"><el-input v-model="form.contactPhone" placeholder="请输入11位手机号" maxlength="11" show-word-limit inputmode="numeric" /></el-form-item>
        <el-form-item label="处理状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="0">待处理</el-radio>
            <el-radio value="1">已确认</el-radio>
            <el-radio value="2">已完成</el-radio>
            <el-radio value="3">已取消</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" placeholder="处理备注" /></el-form-item>
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

<script setup name="Appointment">
import { ref, reactive, toRefs, getCurrentInstance } from "vue";
import { listPetAppointment, getPetAppointment, delPetAppointment, addPetAppointment, updatePetAppointment } from "@/api/pet/petAppointment";

const { proxy } = getCurrentInstance();
const appointmentList = ref([]);
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
  queryParams: { pageNum: 1, pageSize: 10, userId: undefined, status: undefined },
  rules: {
    userId: [{ required: true, message: "用户ID不能为空", trigger: "blur" }],
    petId: [{ required: true, message: "宠物ID不能为空", trigger: "blur" }],
    contactPhone: [
      { required: true, message: "请输入联系电话", trigger: "blur" },
      { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的11位手机号（1开头，共11位数字）", trigger: "blur" }
    ],
  },
});
const { queryParams, form, rules } = toRefs(data);

function getList() {
  loading.value = true;
  listPetAppointment(queryParams.value).then((res) => { appointmentList.value = res.rows; total.value = res.total; loading.value = false; });
}
function handleQuery() { queryParams.value.pageNum = 1; getList(); }
function resetQuery() { proxy.resetForm("queryRef"); handleQuery(); }
function handleSelectionChange(selection) { ids.value = selection.map(i => i.appointmentId); single.value = selection.length !== 1; multiple.value = !selection.length; }
function reset() {
  form.value = { appointmentId: undefined, userId: undefined, petId: undefined, appointmentDate: undefined, contactPhone: undefined, status: "0", remark: undefined };
  proxy.resetForm("apptRef");
}
function handleUpdate(row) {
  reset();
  const id = row.appointmentId || ids.value;
  getPetAppointment(id).then((res) => { form.value = res.data; open.value = true; title.value = "处理预约"; });
}
function submitForm() {
  proxy.$refs["apptRef"].validate((valid) => {
    if (valid) {
      if (form.value.appointmentId) { updatePetAppointment(form.value).then(() => { proxy.$modal.msgSuccess("处理成功"); open.value = false; getList(); }); }
      else { addPetAppointment(form.value).then(() => { proxy.$modal.msgSuccess("新增成功"); open.value = false; getList(); }); }
    }
  });
}
function handleDelete(row) {
  const ids = row.appointmentId || ids.value;
  proxy.$modal.confirm('是否确认删除预约ID为"' + ids + '"的数据项？').then(() => delPetAppointment(ids)).then(() => { getList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function handleExport() { proxy.download("pet/appointment/export", { ...queryParams.value }, `appointment_${new Date().getTime()}.xlsx`); }
function cancel() { open.value = false; reset(); }
getList();
</script>
