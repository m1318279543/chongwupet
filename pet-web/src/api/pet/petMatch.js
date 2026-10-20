import request from "@/utils/request";

// 提交问卷，获取智能匹配结果
export function recommendPet(data) {
  return request({
    url: "/pet/match/recommend",
    method: "post",
    data,
    timeout: 20000,
  });
}

// 匹配记录列表（后台）
export function listMatchRecord(query) {
  return request({
    url: "/pet/match/records",
    method: "get",
    params: query,
  });
}

// 删除匹配记录
export function delMatchRecord(recordIds) {
  return request({
    url: "/pet/match/records/" + recordIds,
    method: "delete",
  });
}

// 清空匹配记录
export function cleanMatchRecord() {
  return request({
    url: "/pet/match/clean",
    method: "delete",
  });
}
