import request from "@/utils/request";

// 查询宠物医生咨询记录列表（后台）
export function listDoctorConsult(query) {
  return request({
    url: "/pet/doctor/consult/list",
    method: "get",
    params: query,
  });
}

// 删除咨询记录
export function delDoctorConsult(consultIds) {
  return request({
    url: "/pet/doctor/consult/" + consultIds,
    method: "delete",
  });
}

// 清空咨询记录
export function cleanDoctorConsult() {
  return request({
    url: "/pet/doctor/consult/clean",
    method: "delete",
  });
}

// 导出咨询记录
export function exportDoctorConsult(query) {
  return request({
    url: "/pet/doctor/consult/export",
    method: "post",
    data: query,
  });
}
