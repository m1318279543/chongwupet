import request from "@/utils/request";

// 查询宠物信息列表
export function listPetInfo(query) {
  return request({
    url: "/pet/info/list",
    method: "get",
    params: query,
  });
}

// 首页/列表页聚合：总数、在售数、分类数、各分类计数、精选 N 只（免登录）
export function getPetOverview(limit = 12) {
  return request({
    url: "/pet/info/overview",
    method: "get",
    params: { limit },
  });
}

// 查询宠物信息详细
export function getPetInfo(petId) {
  return request({
    url: "/pet/info/" + petId,
    method: "get",
  });
}

// 新增宠物信息
export function addPetInfo(data) {
  return request({
    url: "/pet/info",
    method: "post",
    data: data,
  });
}
// 修改宠物信息
export function updatePetInfo(data) {
  return request({
    url: "/pet/info",
    method: "put",
    data: data,
  });
}

// 删除宠物信息
export function delPetInfo(petId) {
  return request({
    url: "/pet/info/" + petId,
    method: "delete",
  });
}
