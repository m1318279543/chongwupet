import request from "@/utils/request";

// 查询预约管理列表
export function listPetAppointment(query) {
  return request({
    url: "/pet/appointment/list",
    method: "get",
    params: query,
  });
}

// 查询预约管理详细
export function getPetAppointment(appointmentId) {
  return request({
    url: "/pet/appointment/" + appointmentId,
    method: "get",
  });
}

// 新增预约管理
export function addPetAppointment(data) {
  return request({
    url: "/pet/appointment",
    method: "post",
    data: data,
  });
}
// 修改预约管理
export function updatePetAppointment(data) {
  return request({
    url: "/pet/appointment",
    method: "put",
    data: data,
  });
}

// 删除预约管理
export function delPetAppointment(appointmentId) {
  return request({
    url: "/pet/appointment/" + appointmentId,
    method: "delete",
  });
}

// 我的预约（只返回当前账号自己的，前台使用）
export function listMyAppointments() {
  return request({
    url: "/pet/appointment/mine",
    method: "get",
  });
}

// 门店可约时段（游客可查）
export function getAppointmentSlots(storeId, date) {
  return request({
    url: "/pet/appointment/slots",
    method: "get",
    params: { storeId, date },
  });
}

// 取消预约（登录用户取消自己的预约，后端会写入取消记录）
export function cancelPetAppointment(appointmentId, reason) {
  return request({
    url: "/pet/appointment/cancel/" + appointmentId,
    method: "post",
    params: { reason: reason || "" },
  });
}
