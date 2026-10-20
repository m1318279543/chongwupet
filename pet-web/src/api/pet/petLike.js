import request from "@/utils/request";

// 查询点赞状态（当前用户是否已赞 + 总赞数）。targetType: pet(默认) / food
export function getLikeStatus(petId, targetType) {
  return request({
    url: "/pet/like/status/" + petId,
    method: "get",
    params: targetType ? { targetType } : undefined,
  });
}

// 点赞
export function likePet(petId, targetType) {
  return request({
    url: "/pet/like/" + petId,
    method: "post",
    params: targetType ? { targetType } : undefined,
  });
}

// 取消点赞
export function unlikePet(petId, targetType) {
  return request({
    url: "/pet/like/" + petId,
    method: "delete",
    params: targetType ? { targetType } : undefined,
  });
}

// 查询点赞记录列表（后台管理）
export function listPetLike(query) {
  return request({
    url: "/pet/like/list",
    method: "get",
    params: query,
  });
}

// 删除点赞记录（后台管理）
export function delPetLike(likeIds) {
  return request({
    url: "/pet/like/record/" + likeIds,
    method: "delete",
  });
}
