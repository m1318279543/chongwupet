import request from "@/utils/request";

// 前台：按分类/科系获取常见问题（健康百科/详情页用，游客可读）
export function listIssueFront(query) {
  return request({
    url: "/pet/issue/front",
    method: "get",
    params: query,
  });
}

// 后台：知识库列表
export function listPetIssue(query) {
  return request({
    url: "/pet/issue/list",
    method: "get",
    params: query,
  });
}

// 后台：按ID查询
export function getPetIssue(issueId) {
  return request({
    url: "/pet/issue/" + issueId,
    method: "get",
  });
}

// 后台：新增
export function addPetIssue(data) {
  return request({
    url: "/pet/issue",
    method: "post",
    data: data,
  });
}

// 后台：修改
export function updatePetIssue(data) {
  return request({
    url: "/pet/issue",
    method: "put",
    data: data,
  });
}

// 后台：删除
export function delPetIssue(issueIds) {
  return request({
    url: "/pet/issue/" + issueIds,
    method: "delete",
  });
}

// 宠物医生智能问答（公开）
// 在线大模型生成回答常超过 10s，单独放宽到 60s，避免前端提前掐断报"请求超时"
export function askDoctor(q) {
  return request({
    url: "/pet/issue/doctor/ask",
    method: "get",
    params: { q },
    timeout: 60000,
  });
}
