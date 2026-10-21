import request from "@/utils/request";

// 查询购物车/订单列表（管理员看全部，普通用户看自己）
export function listPetCart(query) {
  return request({
    url: "/pet/cart/list",
    method: "get",
    params: query,
  });
}

// 结算提交：把选中的商品写入后端
export function submitPetCart(data) {
  return request({
    url: "/pet/cart/submit",
    method: "post",
    data: data,
  });
}

// 删除购物车记录
export function delPetCart(cartIds) {
  return request({
    url: "/pet/cart/" + cartIds,
    method: "delete",
  });
}

// 导出购物车数据
export function exportPetCart(query) {
  return request({
    url: "/pet/cart/export",
    method: "post",
    data: query,
  });
}

// 模拟支付：按订单号支付名下待支付订单
export function payPetCart(orderNo, payMethod) {
  return request({
    url: "/pet/cart/pay/" + orderNo,
    method: "post",
    data: { payMethod: payMethod || "alipay" },
  });
}

// 取消订单（登录用户取消自己的订单，后端会写入取消记录）
export function cancelPetCart(cartId, reason) {
  return request({
    url: "/pet/cart/cancel/" + cartId,
    method: "post",
    params: { reason: reason || "" },
  });
}
