import request from "@/utils/request";

// 门店服务评价汇总（游客可读）：avg/count/mine
export function serviceRatingStat() {
  return request({
    url: "/pet/service/rating/stat",
    method: "get",
  });
}

// 提交服务评价（score 1~5 星 + content 文字可空，登录后提交）
export function submitServiceRating(data) {
  return request({
    url: "/pet/service/rating",
    method: "post",
    data,
  });
}
