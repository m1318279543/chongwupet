import request from "@/utils/request";

// 查询取消记录列表（后台）
export function listCancelRecord(query) {
  return request({
    url: "/pet/cancel/list",
    method: "get",
    params: query,
  });
}

// 删除取消记录
export function delCancelRecord(recordIds) {
  return request({
    url: "/pet/cancel/" + recordIds,
    method: "delete",
  });
}

// 清空取消记录
export function cleanCancelRecord() {
  return request({
    url: "/pet/cancel/clean",
    method: "delete",
  });
}

// 导出取消记录
export function exportCancelRecord(query) {
  return request({
    url: "/pet/cancel/export",
    method: "post",
    data: query,
  });
}
