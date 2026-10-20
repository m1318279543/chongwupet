import request from "@/utils/request";

// 前台：按宠物ID查看喜好（游客可读）
export function getPetPreference(petId) {
  return request({
    url: "/pet/preference/" + petId,
    method: "get",
  });
}

// 后台：喜好列表
export function listPetPreference(query) {
  return request({
    url: "/pet/preference/list",
    method: "get",
    params: query,
  });
}

// 后台：按ID查询
export function getPetPreferenceById(preferenceId) {
  return request({
    url: "/pet/preference/detail/" + preferenceId,
    method: "get",
  });
}

// 后台：新增
export function addPetPreference(data) {
  return request({
    url: "/pet/preference",
    method: "post",
    data: data,
  });
}

// 后台：修改
export function updatePetPreference(data) {
  return request({
    url: "/pet/preference",
    method: "put",
    data: data,
  });
}

// 后台：删除
export function delPetPreference(preferenceIds) {
  return request({
    url: "/pet/preference/" + preferenceIds,
    method: "delete",
  });
}
