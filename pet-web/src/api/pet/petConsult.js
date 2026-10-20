import request from "@/utils/request";

// 用户提交咨询（需登录）
export function submitConsult(data) {
  return request({
    url: "/pet/consult/submit",
    method: "post",
    data: data,
  });
}

// 用户查看自己的咨询（需登录）
export function listMyConsult() {
  return request({
    url: "/pet/consult/my",
    method: "get",
  });
}

// 后台：咨询列表
export function listPetConsult(query) {
  return request({
    url: "/pet/consult/list",
    method: "get",
    params: query,
  });
}

// 后台：客服回复
export function replyConsult(data) {
  return request({
    url: "/pet/consult/reply",
    method: "put",
    data: data,
  });
}

// 后台：删除
export function delPetConsult(consultIds) {
  return request({
    url: "/pet/consult/" + consultIds,
    method: "delete",
  });
}
