import request from "@/utils/request";

// 查询收藏管理列表
export function listPetFavorite(query) {
  return request({
    url: "/pet/favorite/list",
    method: "get",
    params: query,
  });
}

// 查询收藏管理详细
export function getPetFavorite(favoriteId) {
  return request({
    url: "/pet/favorite/" + favoriteId,
    method: "get",
  });
}

// 新增收藏管理
export function addPetFavorite(data) {
  return request({
    url: "/pet/favorite",
    method: "post",
    data: data,
  });
}

// 删除收藏管理
export function delPetFavorite(favoriteId) {
  return request({
    url: "/pet/favorite/" + favoriteId,
    method: "delete",
  });
}
