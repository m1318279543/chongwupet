import request from "@/utils/request";

// 查询评论列表（传 petId 为前台详情页评论；后台管理走 /pet/comment/manage/list）
export function listPetComment(query) {
  return request({
    url: "/pet/comment/list",
    method: "get",
    params: query,
  });
}

// 后台评论管理列表（含隐藏评论，需要 pet:comment:manage 权限）
export function listPetCommentManage(query) {
  return request({
    url: "/pet/comment/manage/list",
    method: "get",
    params: query,
  });
}

// 发表评论（parentId 非空时为回复）
export function addPetComment(data) {
  return request({
    url: "/pet/comment",
    method: "post",
    data: data,
  });
}

// 删除评论（自己的或管理员）
export function delPetComment(commentId) {
  return request({
    url: "/pet/comment/" + commentId,
    method: "delete",
  });
}

// 后台修改评论状态（显示/隐藏）
export function updatePetComment(data) {
  return request({
    url: "/pet/comment",
    method: "put",
    data: data,
  });
}

// 后台批量删除评论
export function delPetCommentBatch(commentIds) {
  return request({
    url: "/pet/comment/batch/" + commentIds,
    method: "delete",
  });
}
