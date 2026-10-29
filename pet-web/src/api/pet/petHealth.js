import request from "@/utils/request";

// 前台：按宠物ID查询健康与服务档案（游客可读）
export function getPetHealth(petId) {
  return request({
    url: "/pet/health/" + petId,
    method: "get",
  });
}

// 后台：档案列表
export function listPetHealth(query) {
  return request({
    url: "/pet/health/list",
    method: "get",
    params: query,
  });
}

// 后台：按档案ID查询
export function getPetHealthById(healthId) {
  return request({
    url: "/pet/health/detail/" + healthId,
    method: "get",
  });
}

// 后台：新增档案
export function addPetHealth(data) {
  return request({
    url: "/pet/health",
    method: "post",
    data: data,
  });
}

// 后台：修改档案
export function updatePetHealth(data) {
  return request({
    url: "/pet/health",
    method: "put",
    data: data,
  });
}

// 后台：删除档案
export function delPetHealth(healthIds) {
  return request({
    url: "/pet/health/" + healthIds,
    method: "delete",
  });
}
