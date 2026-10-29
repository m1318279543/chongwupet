<template>
  <div class="pet-admin">
    <!-- 宠物信息 / 健康档案 / 宠物喜好原先是三个独立页面，同一 petId 三处维护、
         互相还不链接。合并为一个「宠物档案」页，用 tab 切换，共用跳前台与图片兜底。 -->
    <el-tabs v-model="activeTab" class="pet-tabs">

      <!-- ============ 基本信息 ============ -->
      <el-tab-pane label="基本信息" name="info">
        <el-card shadow="never" class="ui-toolbar-card">
          <el-form :model="infoQuery" ref="infoQueryRef" :inline="true" v-show="infoShowSearch" label-width="68px">
            <el-form-item label="宠物名称" prop="petName">
              <el-input v-model="infoQuery.petName" placeholder="请输入宠物名称" clearable style="width: 200px" @keyup.enter="infoHandleQuery" />
            </el-form-item>
            <el-form-item label="状态" prop="status">
              <el-select v-model="infoQuery.status" placeholder="状态" clearable style="width: 160px">
                <el-option label="在售" value="0" />
                <el-option label="已售" value="1" />
                <el-option label="下架" value="2" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" icon="Search" @click="infoHandleQuery">搜索</el-button>
              <el-button icon="Refresh" @click="infoResetQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="ui-card-head">
              <div class="head-actions">
                <el-button type="primary" plain icon="Plus" @click="infoHandleAdd" v-hasPermi="['pet:info:add']">新增</el-button>
                <el-button type="success" plain icon="Edit" :disabled="infoSingle" @click="infoHandleUpdate" v-hasPermi="['pet:info:edit']">修改</el-button>
                <el-button type="danger" plain icon="Delete" :disabled="infoMultiple" @click="infoHandleDelete" v-hasPermi="['pet:info:remove']">删除</el-button>
                <el-button type="warning" plain icon="Download" @click="infoHandleExport" v-hasPermi="['pet:info:export']">导出</el-button>
              </div>
              <right-toolbar v-model:showSearch="infoShowSearch" @queryTable="infoGetList"></right-toolbar>
            </div>
          </template>

          <el-table v-loading="infoLoading" :data="infoList" border stripe @selection-change="infoHandleSelectionChange">
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
            <template #default="scope"><span class="ui-money">¥{{ money(scope.row.price, 2) }}</span></template>
          </el-table-column>
          <el-table-column label="状态" align="center" prop="status" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.status==='0'?'success':scope.row.status==='1'?'info':'danger'">
                {{ ['在售','已售','下架'][scope.row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="健康 / 喜好" align="center" width="130">
            <template #default="scope">
              <el-button link type="primary" @click="jumpTab('health', scope.row)">健康档案</el-button>
              <el-button link type="primary" @click="jumpTab('preference', scope.row)">喜好</el-button>
            </template>
          </el-table-column>
          <el-table-column label="创建时间" align="center" prop="createTime" width="160">
            <template #default="scope"><span>{{ parseTime(scope.row.createTime) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" align="center" width="160">
            <template #default="scope">
              <el-button link type="primary" icon="Edit" @click="infoHandleUpdate(scope.row)" v-hasPermi="['pet:info:edit']">修改</el-button>
              <el-button link type="primary" icon="Delete" @click="infoHandleDelete(scope.row)" v-hasPermi="['pet:info:remove']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

          <div class="ui-pager">
            <pagination v-show="infoTotal > 0" :total="infoTotal" v-model:page="infoQuery.pageNum" v-model:limit="infoQuery.pageSize" @pagination="infoGetList" />
          </div>
        </el-card>

        <el-dialog :title="infoTitle" v-model="infoOpen" width="600px" append-to-body>
          <el-form ref="infoFormRef" :model="infoForm" :rules="infoRules" label-width="90px">
            <el-row :gutter="10">
              <el-col :span="12">
                <el-form-item label="分类ID" prop="categoryId">
                  <el-input-number v-model="infoForm.categoryId" controls-position="right" :min="0" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="宠物名称" prop="petName">
                  <el-input v-model="infoForm.petName" placeholder="如：旺财" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="品种" prop="breed"><el-input v-model="infoForm.breed" placeholder="如：金毛" /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="年龄" prop="age"><el-input v-model="infoForm.age" placeholder="如：2岁" /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="性别" prop="gender">
                  <el-radio-group v-model="infoForm.gender">
                    <el-radio value="0">公</el-radio>
                    <el-radio value="1">母</el-radio>
                    <el-radio value="2">未知</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="价格" prop="price"><el-input-number v-model="infoForm.price" :precision="2" :min="0" /></el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="图片URL" prop="image"><el-input v-model="infoForm.image" placeholder="图片地址" /></el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="状态" prop="status">
                  <el-radio-group v-model="infoForm.status">
                    <el-radio value="0">在售</el-radio>
                    <el-radio value="1">已售</el-radio>
                    <el-radio value="2">下架</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="描述" prop="description"><el-input v-model="infoForm.description" type="textarea" placeholder="宠物描述" /></el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="备注" prop="remark"><el-input v-model="infoForm.remark" type="textarea" /></el-form-item>
              </el-col>
            </el-row>
          </el-form>
          <template #footer>
            <div class="dialog-footer">
              <el-button type="primary" @click="infoSubmitForm">确 定</el-button>
              <el-button @click="infoCancel">取 消</el-button>
            </div>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ============ 健康档案 ============ -->
      <el-tab-pane label="健康档案" name="health">
        <el-card shadow="never" class="ui-toolbar-card">
          <el-form :model="healthQuery" inline>
            <el-form-item label="宠物名称">
              <el-input v-model="healthQuery.petName" placeholder="请输入宠物名称" clearable style="width: 160px" @keyup.enter="healthHandleQuery" />
            </el-form-item>
            <el-form-item label="档案编号">
              <el-input v-model="healthQuery.archiveNo" placeholder="请输入档案编号" clearable style="width: 160px" @keyup.enter="healthHandleQuery" />
            </el-form-item>
            <el-form-item label="健康等级">
              <el-select v-model="healthQuery.healthLevel" placeholder="全部" clearable style="width: 120px">
                <el-option label="优秀" value="优秀" />
                <el-option label="良好" value="良好" />
                <el-option label="观察中" value="观察中" />
              </el-select>
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="healthQuery.status" placeholder="全部" clearable style="width: 110px">
                <el-option label="正常" value="0" />
                <el-option label="停用" value="1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="healthHandleQuery">搜索</el-button>
              <el-button @click="healthResetQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="ui-card-head">
              <span>共 {{ healthTotal }} 份档案</span>
              <div>
                <el-button type="primary" @click="healthHandleAdd">新增档案</el-button>
              </div>
            </div>
          </template>

          <el-table v-loading="healthLoading" :data="healthList" border stripe>
            <el-table-column label="宠物" min-width="180">
              <template #default="{ row }">
                <div class="ui-pet-cell">
                  <img v-if="isImage(row.image)" :src="row.image" class="ui-pet-cell__img" :alt="row.petName" />
                  <span v-else class="ui-pet-cell__emoji">—</span>
                  <div class="pet-meta">
                    <el-link type="primary" underline="never" @click="goFront(row)">{{ row.petName }}</el-link>
                    <span class="sub">{{ row.breed || '—' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="档案编号" prop="archiveNo" width="130" />
            <el-table-column label="健康等级" width="100">
              <template #default="{ row }">
                <el-tag :type="row.healthLevel === '优秀' ? 'success' : row.healthLevel === '良好' ? 'primary' : 'warning'">
                  {{ row.healthLevel || '—' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="疫苗" min-width="200">
              <template #default="{ row }">
                <div class="cell-sm">{{ row.vaccineName }}</div>
                <div class="ui-cell-sub">进度 {{ row.vaccineProgress }} · {{ fmtDay(row.vaccineDate) }}</div>
              </template>
            </el-table-column>
            <el-table-column label="体检结论" min-width="200">
              <template #default="{ row }">
                <div class="cell-sm">{{ row.examResult }}</div>
                <div class="ui-cell-sub">{{ fmtDay(row.examDate) }} · {{ row.examHospital }}</div>
              </template>
            </el-table-column>
            <el-table-column label="来源" min-width="150">
              <template #default="{ row }">
                <div class="cell-sm">{{ row.sourceChannel }}</div>
                <div class="ui-cell-sub">{{ row.sourcePlace }}</div>
              </template>
            </el-table-column>
            <el-table-column label="保障" width="90">
              <template #default="{ row }">{{ row.guaranteeDays }} 天</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="healthHandleUpdate(row)">修改</el-button>
                <el-button link type="success" @click="goFront(row)">前台查看</el-button>
                <el-button link type="danger" @click="healthHandleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="ui-pager">
            <el-pagination
              v-model:current-page="healthQuery.pageNum"
              v-model:page-size="healthQuery.pageSize"
              :page-sizes="[10, 20, 50]"
              :total="healthTotal"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="healthGetList"
              @current-change="healthGetList"
            />
          </div>
        </el-card>

        <el-dialog :title="healthTitle" v-model="healthOpen" width="760px" append-to-body>
          <el-tabs v-model="healthActiveTab">
            <el-tab-pane label="健康筛查" name="health">
              <el-form :model="healthForm" label-width="100px">
                <el-form-item label="宠物">
                  <el-input v-model="healthForm.petName" :disabled="healthForm.healthId != null" placeholder="选择宠物" style="width: 240px" />
                  <el-input v-model.number="healthForm.petId" :disabled="healthForm.healthId != null" type="number" placeholder="宠物ID" style="width: 140px; margin-left: 8px" />
                </el-form-item>
                <el-form-item label="档案编号">
                  <el-input v-model="healthForm.archiveNo" placeholder="留空自动生成" style="width: 280px" />
                </el-form-item>
                <el-form-item label="疫苗名称"><el-input v-model="healthForm.vaccineName" placeholder="如 猫三联（妙三多）" /></el-form-item>
                <el-form-item label="疫苗进度"><el-input v-model="healthForm.vaccineProgress" placeholder="如 3/3" style="width: 160px" /></el-form-item>
                <el-form-item label="接种日期">
                  <el-date-picker v-model="healthForm.vaccineDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
                </el-form-item>
                <el-form-item label="驱虫用药"><el-input v-model="healthForm.dewormName" /></el-form-item>
                <el-form-item label="驱虫日期">
                  <el-date-picker v-model="healthForm.dewormDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
                </el-form-item>
                <el-form-item label="体检项目"><el-input v-model="healthForm.examItems" type="textarea" :rows="2" /></el-form-item>
                <el-form-item label="体检结论"><el-input v-model="healthForm.examResult" placeholder="如 全部合格" /></el-form-item>
                <el-form-item label="体检日期">
                  <el-date-picker v-model="healthForm.examDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
                </el-form-item>
                <el-form-item label="体检机构"><el-input v-model="healthForm.examHospital" /></el-form-item>
                <el-form-item label="遗传病排查"><el-input v-model="healthForm.geneticScreen" type="textarea" :rows="2" /></el-form-item>
                <el-form-item label="健康等级">
                  <el-select v-model="healthForm.healthLevel" style="width: 160px">
                    <el-option label="优秀" value="优秀" /><el-option label="良好" value="良好" /><el-option label="观察中" value="观察中" />
                  </el-select>
                </el-form-item>
                <el-form-item label="健康备注"><el-input v-model="healthForm.healthNote" type="textarea" :rows="2" /></el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="真实信息" name="origin">
              <el-form :model="healthForm" label-width="100px">
                <el-form-item label="来源渠道"><el-input v-model="healthForm.sourceChannel" /></el-form-item>
                <el-form-item label="来源地"><el-input v-model="healthForm.sourcePlace" /></el-form-item>
                <el-form-item label="父本"><el-input v-model="healthForm.fatherInfo" /></el-form-item>
                <el-form-item label="母本"><el-input v-model="healthForm.motherInfo" /></el-form-item>
                <el-form-item label="出生日期">
                  <el-date-picker v-model="healthForm.birthDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
                </el-form-item>
                <el-form-item label="是否实拍">
                  <el-radio-group v-model="healthForm.isPhotoReal">
                    <el-radio value="0">实拍</el-radio><el-radio value="1">非实拍</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="专业养护" name="care">
              <el-form :model="healthForm" label-width="100px">
                <el-form-item label="性格特点"><el-input v-model="healthForm.temperament" /></el-form-item>
                <el-form-item label="饲养难度">
                  <el-select v-model="healthForm.skillLevel" style="width: 160px">
                    <el-option label="入门" value="入门" /><el-option label="进阶" value="进阶" /><el-option label="挑战" value="挑战" />
                  </el-select>
                </el-form-item>
                <el-form-item label="喂养方案"><el-input v-model="healthForm.feedPlan" type="textarea" :rows="3" /></el-form-item>
                <el-form-item label="护理要点"><el-input v-model="healthForm.carePoints" type="textarea" :rows="3" /></el-form-item>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="售后无忧" name="after">
              <el-form :model="healthForm" label-width="100px">
                <el-form-item label="保障天数"><el-input-number v-model="healthForm.guaranteeDays" :min="1" :max="365" /></el-form-item>
                <el-form-item label="合同编号"><el-input v-model="healthForm.contractNo" style="width: 240px" /></el-form-item>
                <el-form-item label="送达方式"><el-input v-model="healthForm.deliverySupport" /></el-form-item>
                <el-form-item label="售后说明"><el-input v-model="healthForm.aftersaleNote" type="textarea" :rows="3" /></el-form-item>
                <el-form-item label="状态">
                  <el-radio-group v-model="healthForm.status">
                    <el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </el-tab-pane>
          </el-tabs>

          <template #footer>
            <el-button @click="healthOpen = false">取消</el-button>
            <el-button type="primary" :loading="healthSubmitting" @click="healthSubmitForm">确定</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>

      <!-- ============ 宠物喜好 ============ -->
      <el-tab-pane label="宠物喜好" name="preference">
        <el-card shadow="never" class="ui-toolbar-card">
          <el-form :model="prefQuery" inline>
            <el-form-item label="宠物名称">
              <el-input v-model="prefQuery.petName" placeholder="请输入" clearable style="width: 160px" @keyup.enter="prefHandleQuery" />
            </el-form-item>
            <el-form-item label="喜欢的食物">
              <el-input v-model="prefQuery.foodLike" placeholder="请输入" clearable style="width: 160px" @keyup.enter="prefHandleQuery" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="prefQuery.status" placeholder="全部" clearable style="width: 110px">
                <el-option label="正常" value="0" /><el-option label="停用" value="1" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="prefHandleQuery">搜索</el-button>
              <el-button @click="prefResetQuery">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="ui-card-head">
              <span>共 {{ prefTotal }} 条喜好记录</span>
              <el-button type="primary" @click="prefHandleAdd">新增喜好</el-button>
            </div>
          </template>

          <el-table v-loading="prefLoading" :data="prefList" border stripe>
            <el-table-column label="宠物" min-width="180">
              <template #default="{ row }">
                <div class="ui-pet-cell">
                  <img v-if="isImage(row.image)" :src="row.image" class="ui-pet-cell__img" :alt="row.petName" />
                  <span v-else class="ui-pet-cell__emoji">—</span>
                  <div class="pet-meta">
                    <el-link type="primary" underline="never" @click="goFront(row)">{{ row.petName }}</el-link>
                    <span class="sub">{{ row.breed || '—' }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="爱吃" prop="foodLike" min-width="140" show-overflow-tooltip />
            <el-table-column label="爱玩" prop="toyLike" min-width="140" show-overflow-tooltip />
            <el-table-column label="性格" prop="personality" min-width="140" show-overflow-tooltip />
            <el-table-column label="活跃度" width="90">
              <template #default="{ row }"><el-tag size="small">{{ row.activityLevel || '—' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="禁忌" prop="taboo" min-width="160" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }"><el-tag :type="row.status === '0' ? 'success' : 'info'">{{ row.status === '0' ? '正常' : '停用' }}</el-tag></template>
            </el-table-column>
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="prefHandleUpdate(row)">修改</el-button>
                <el-button link type="success" @click="goFront(row)">前台</el-button>
                <el-button link type="danger" @click="prefHandleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="ui-pager">
            <el-pagination v-model:current-page="prefQuery.pageNum" v-model:page-size="prefQuery.pageSize"
              :page-sizes="[10, 20, 50]" :total="prefTotal" layout="total, sizes, prev, pager, next, jumper"
              @size-change="prefGetList" @current-change="prefGetList" />
          </div>
        </el-card>

        <el-dialog :title="prefTitle" v-model="prefOpen" width="720px" append-to-body>
          <el-form :model="prefForm" label-width="100px">
            <el-form-item label="宠物">
              <el-input v-model="prefForm.petName" :disabled="prefForm.preferenceId != null" placeholder="宠物名称" style="width: 200px" />
              <el-input v-model.number="prefForm.petId" :disabled="prefForm.preferenceId != null" type="number" placeholder="宠物ID" style="width: 140px; margin-left: 8px" />
            </el-form-item>
            <el-form-item label="爱吃"><el-input v-model="prefForm.foodLike" placeholder="如 猫粮、冻干、猫条" /></el-form-item>
            <el-form-item label="爱玩"><el-input v-model="prefForm.toyLike" placeholder="如 逗猫棒、猫爬架" /></el-form-item>
            <el-form-item label="性格"><el-input v-model="prefForm.personality" placeholder="如 独立又粘人" /></el-form-item>
            <el-form-item label="活跃度">
              <el-select v-model="prefForm.activityLevel" style="width: 160px">
                <el-option label="高" value="高" /><el-option label="中" value="中" /><el-option label="低" value="低" />
              </el-select>
            </el-form-item>
            <el-form-item label="喜欢的环境"><el-input v-model="prefForm.envLike" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="禁忌注意"><el-input v-model="prefForm.taboo" type="textarea" :rows="2" placeholder="如 严禁巧克力、洋葱" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="prefForm.note" type="textarea" :rows="2" /></el-form-item>
            <el-form-item label="状态">
              <el-radio-group v-model="prefForm.status"><el-radio value="0">正常</el-radio><el-radio value="1">停用</el-radio></el-radio-group>
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="prefOpen = false">取消</el-button>
            <el-button type="primary" :loading="prefSubmitting" @click="prefSubmitForm">确定</el-button>
          </template>
        </el-dialog>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup name="PetProfile">
import { ref, reactive, toRefs, getCurrentInstance, onMounted } from "vue";
import { ElMessage, ElMessageBox } from 'element-plus'
import { listPetInfo, getPetInfo, delPetInfo, addPetInfo, updatePetInfo } from "@/api/pet/petInfo";
import { listPetHealth, addPetHealth, updatePetHealth, delPetHealth } from "@/api/pet/petHealth";
import { listPetPreference, addPetPreference, updatePetPreference, delPetPreference } from "@/api/pet/petPreference";
import { isImage } from "@/utils/petDisplay";
import { money, fmtDay } from "@/utils/format";

const { proxy } = getCurrentInstance();

// ---------------- 共用 ----------------
const activeTab = ref('info')
function goFront(row) { window.open('/shop/pet/' + row.petId, '_blank') }
// 从基本信息行内跳到健康/喜好 tab，并带上该宠物做过滤
function jumpTab(tab, row) {
  activeTab.value = tab
  if (tab === 'health') { healthQuery.petName = row.petName || ''; healthGetList() }
  if (tab === 'preference') { prefQuery.petName = row.petName || ''; prefGetList() }
}

// ---------------- 基本信息 ----------------
const infoList = ref([]);
const infoLoading = ref(true);
const infoShowSearch = ref(true);
const infoIds = ref([]);
const infoSingle = ref(true);
const infoMultiple = ref(true);
const infoTotal = ref(0);
const infoTitle = ref("");
const infoOpen = ref(false);
const infoQuery = reactive({ pageNum: 1, pageSize: 10, petName: undefined, status: undefined });
const infoData = reactive({
  infoForm: {},
  infoRules: { petName: [{ required: true, message: "宠物名称不能为空", trigger: "blur" }] },
});
const { infoForm, infoRules } = toRefs(infoData);

function infoGetList() {
  infoLoading.value = true;
  listPetInfo(infoQuery).then((res) => { infoList.value = res.rows; infoTotal.value = res.total; infoLoading.value = false; });
}
function infoHandleQuery() { infoQuery.pageNum = 1; infoGetList(); }
function infoResetQuery() { proxy.resetForm("infoQueryRef"); infoHandleQuery(); }
function infoHandleSelectionChange(selection) { infoIds.value = selection.map(i => i.petId); infoSingle.value = selection.length !== 1; infoMultiple.value = !selection.length; }
function infoReset() {
  infoData.infoForm = { petId: undefined, categoryId: undefined, petName: undefined, breed: undefined, age: undefined, gender: "0", price: 0, image: undefined, status: "0", description: undefined, remark: undefined };
  proxy.resetForm("infoFormRef");
}
function infoHandleAdd() { infoReset(); infoOpen.value = true; infoTitle.value = "新增宠物信息"; }
function infoHandleUpdate(row) {
  infoReset();
  const id = row.petId || infoIds.value;
  getPetInfo(id).then((res) => { infoData.infoForm = res.data; infoOpen.value = true; infoTitle.value = "修改宠物信息"; });
}
function infoSubmitForm() {
  proxy.$refs["infoFormRef"].validate((valid) => {
    if (valid) {
      if (infoData.infoForm.petId) { updatePetInfo(infoData.infoForm).then(() => { proxy.$modal.msgSuccess("修改成功"); infoOpen.value = false; infoGetList(); }); }
      else { addPetInfo(infoData.infoForm).then(() => { proxy.$modal.msgSuccess("新增成功"); infoOpen.value = false; infoGetList(); }); }
    }
  });
}
function infoHandleDelete(row) {
  const ids = row.petId || infoIds.value;
  proxy.$modal.confirm('是否确认删除宠物ID为"' + ids + '"的数据项？').then(() => delPetInfo(ids)).then(() => { infoGetList(); proxy.$modal.msgSuccess("删除成功"); }).catch(() => {});
}
function infoHandleExport() { proxy.download("pet/info/export", { ...infoQuery }, `petInfo_${new Date().getTime()}.xlsx`); }
function infoCancel() { infoOpen.value = false; infoReset(); }

// ---------------- 健康档案 ----------------
const healthList = ref([])
const healthTotal = ref(0)
const healthLoading = ref(false)
const healthOpen = ref(false)
const healthTitle = ref('')
const healthSubmitting = ref(false)
const healthActiveTab = ref('health')
const healthQuery = reactive({ pageNum: 1, pageSize: 10, petName: '', archiveNo: '', healthLevel: '', status: '' })
const healthForm = reactive(healthEmptyForm())
function healthEmptyForm() {
  return {
    healthId: null, petId: null, petName: '', archiveNo: '',
    vaccineName: '', vaccineProgress: '', vaccineDate: '', dewormName: '', dewormDate: '',
    examItems: '', examResult: '', examDate: '', examHospital: '', geneticScreen: '',
    healthLevel: '优秀', healthNote: '',
    sourceChannel: '', sourcePlace: '', fatherInfo: '', motherInfo: '', birthDate: '', isPhotoReal: '0',
    temperament: '', skillLevel: '入门', feedPlan: '', carePoints: '',
    guaranteeDays: 7, contractNo: '', deliverySupport: '', aftersaleNote: '',
    status: '0'
  }
}
async function healthGetList() {
  healthLoading.value = true
  try {
    const res = await listPetHealth(healthQuery)
    healthList.value = res.rows || []
    healthTotal.value = res.total || 0
  } catch (e) { ElMessage.error(e?.message || '加载失败') }
  finally { healthLoading.value = false }
}
function healthHandleQuery() { healthQuery.pageNum = 1; healthGetList() }
function healthResetQuery() {
  healthQuery.petName = ''; healthQuery.archiveNo = ''; healthQuery.healthLevel = ''; healthQuery.status = ''
  healthHandleQuery()
}
function healthHandleAdd() {
  Object.assign(healthForm, healthEmptyForm())
  healthTitle.value = '新增健康档案'
  healthActiveTab.value = 'health'
  healthOpen.value = true
}
function healthHandleUpdate(row) {
  Object.assign(healthForm, healthEmptyForm(), JSON.parse(JSON.stringify(row)))
  healthTitle.value = '修改健康档案 - ' + (row.petName || row.archiveNo)
  healthActiveTab.value = 'health'
  healthOpen.value = true
}
async function healthSubmitForm() {
  if (!healthForm.petId) { ElMessage.warning('请填写宠物ID'); return }
  healthSubmitting.value = true
  try {
    if (healthForm.healthId) { await updatePetHealth(healthForm); ElMessage.success('修改成功，前台已同步更新') }
    else { await addPetHealth(healthForm); ElMessage.success('新增成功，前台已同步展示') }
    healthOpen.value = false
    healthGetList()
  } catch (e) { ElMessage.error(e?.message || '操作失败') }
  finally { healthSubmitting.value = false }
}
async function healthHandleDelete(row) {
  try { await ElMessageBox.confirm(`确定删除「${row.petName || row.archiveNo}」的健康档案吗？`, '提示', { type: 'warning' }) }
  catch (e) { return }
  try { await delPetHealth(row.healthId); ElMessage.success('删除成功'); healthGetList() }
  catch (e) { ElMessage.error(e?.message || '删除失败') }
}

// ---------------- 宠物喜好 ----------------
const prefList = ref([])
const prefTotal = ref(0)
const prefLoading = ref(false)
const prefOpen = ref(false)
const prefTitle = ref('')
const prefSubmitting = ref(false)
const prefQuery = reactive({ pageNum: 1, pageSize: 10, petName: '', foodLike: '', status: '' })
const prefForm = reactive(prefEmptyForm())
function prefEmptyForm() {
  return { preferenceId: null, petId: null, petName: '', foodLike: '', toyLike: '', personality: '',
    activityLevel: '中', envLike: '', taboo: '', note: '', status: '0' }
}
async function prefGetList() {
  prefLoading.value = true
  try {
    const res = await listPetPreference(prefQuery)
    prefList.value = res.rows || []
    prefTotal.value = res.total || 0
  } catch (e) { ElMessage.error(e?.message || '加载失败') }
  finally { prefLoading.value = false }
}
function prefHandleQuery() { prefQuery.pageNum = 1; prefGetList() }
function prefResetQuery() { prefQuery.petName = ''; prefQuery.foodLike = ''; prefQuery.status = ''; prefHandleQuery() }
function prefHandleAdd() { Object.assign(prefForm, prefEmptyForm()); prefTitle.value = '新增宠物喜好'; prefOpen.value = true }
function prefHandleUpdate(row) { Object.assign(prefForm, prefEmptyForm(), JSON.parse(JSON.stringify(row))); prefTitle.value = '修改宠物喜好'; prefOpen.value = true }
async function prefSubmitForm() {
  if (!prefForm.petId) { ElMessage.warning('请填写宠物ID'); return }
  prefSubmitting.value = true
  try {
    if (prefForm.preferenceId) { await updatePetPreference(prefForm); ElMessage.success('修改成功') }
    else { await addPetPreference(prefForm); ElMessage.success('新增成功') }
    prefOpen.value = false; prefGetList()
  } catch (e) { ElMessage.error(e?.message || '操作失败') }
  finally { prefSubmitting.value = false }
}
async function prefHandleDelete(row) {
  try { await ElMessageBox.confirm(`确定删除「${row.petName || row.preferenceId}」的喜好记录吗？`, '提示', { type: 'warning' }) }
  catch (e) { return }
  try { await delPetPreference(row.preferenceId); ElMessage.success('删除成功'); prefGetList() }
  catch (e) { ElMessage.error(e?.message || '删除失败') }
}

onMounted(() => { infoGetList() })
</script>

<style scoped lang="scss">
.pet-admin { padding: 4px; }
.pet-tabs { :deep(.el-tabs__header) { margin-bottom: 14px; } }
.head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pet-meta { display: flex; flex-direction: column; line-height: 1.4;
  .sub { color: var(--text-3); font-size: var(--fs-2); }
}
.cell-sm { font-size: var(--fs-4); color: var(--text-1); }
</style>
