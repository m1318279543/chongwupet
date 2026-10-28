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

// 批量支付：购物车勾选的待支付订单（含本次新下的单）一次性结清
export function payBatchOrders(orderNos, payMethod) {
  return request({
    url: "/pet/cart/pay-batch",
    method: "post",
    data: { orderNos, payMethod: payMethod || "alipay" },
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

// ---------- 前台购物车（按账号持久化，全部接口需登录） ----------

// 查询我的购物车条目
export function listCartItems() {
  return request({ url: "/pet/shopcart/items", method: "get" });
}

// 加入购物车（单条，服务端按同款合并）
export function addCartItem(data) {
  return request({ url: "/pet/shopcart/items", method: "post", data });
}

// 登录后合并本地购物车：逐条合并后返回完整列表
export function mergeCartItems(data) {
  return request({ url: "/pet/shopcart/items/merge", method: "post", data });
}

// 修改数量 / 选中态（data: { qty, checked }，传哪个改哪个）
export function updateCartItem(cartItemId, data) {
  return request({ url: "/pet/shopcart/items/" + cartItemId, method: "put", data });
}

// 全选 / 全不选
export function checkAllCartItems(checked) {
  return request({ url: "/pet/shopcart/items/checkall", method: "put", params: { checked: checked ? 1 : 0 } });
}

// 删除条目（可批量）
export function delCartItems(cartItemIds) {
  return request({ url: "/pet/shopcart/items/" + cartItemIds.join(","), method: "delete" });
}

// 清空我的购物车
export function clearCartItems() {
  return request({ url: "/pet/shopcart/items", method: "delete" });
}
