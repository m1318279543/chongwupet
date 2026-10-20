import request from "@/utils/request";

// 查询宠物分类列表
export function listCategory(query) {
  return request({
    url: "/pet/category/list",
    method: "get",
    params: query,
  });
}

// 查询宠物分类详细
export function getCategory(categoryId) {
  return request({
    url: "/pet/category/" + categoryId,
    method: "get",
  });
}

// 新增宠物分类
export function addCategory(data) {
  return request({
    url: "/pet/category",
    method: "post",
    data: data,
  });
}

// 修改宠物分类
export function updateCategory(data) {
  return request({
    url: "/pet/category",
    method: "put",
    data: data,
  });
}

// 删除宠物分类
export function delCategory(categoryId) {
  return request({
    url: "/pet/category/" + categoryId,
    method: "delete",
  });
}
