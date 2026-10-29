package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.domain.PetPaymentLog;
import com.ruoyi.system.domain.PetServiceItem;
import com.ruoyi.system.domain.PetServiceLog;
import com.ruoyi.system.domain.PetServiceOrder;
import com.ruoyi.system.mapper.PetAppointmentMapper;
import com.ruoyi.system.mapper.PetServiceItemMapper;
import com.ruoyi.system.mapper.PetServiceOrderMapper;
import com.ruoyi.system.service.IPetPaymentLogService;
import com.ruoyi.system.service.IPetServiceOrderService;
import com.ruoyi.system.service.IPetWalletService;

/**
 * 服务工单 服务层实现
 *
 * 工单状态机：
 *   0 待接单 --dispatch--> 1 已接单 --start--> 2 服务中 --finish--> 3 已完成
 *   0/1/2 --cancel--> 4 已取消
 * 每次流转都会写一条 pet_service_log，保证"谁在什么时候改的"可追溯。
 *
 * @author ruoyi
 */
@Service
public class PetServiceOrderServiceImpl implements IPetServiceOrderService
{
    @Autowired
    private PetServiceOrderMapper petServiceOrderMapper;

    @Autowired
    private PetServiceItemMapper petServiceItemMapper;

    @Autowired
    private PetAppointmentMapper petAppointmentMapper;

    @Autowired
    private IPetWalletService petWalletService;

    @Autowired
    private IPetPaymentLogService petPaymentLogService;

    @Override
    public List<PetServiceOrder> selectPetServiceOrderList(PetServiceOrder order)
    {
        return petServiceOrderMapper.selectPetServiceOrderList(order);
    }

    @Override
    public PetServiceOrder selectPetServiceOrderById(Long serviceId)
    {
        return petServiceOrderMapper.selectPetServiceOrderById(serviceId);
    }

    @Override
    public PetServiceOrder selectByNo(String serviceNo)
    {
        if (StringUtils.isBlank(serviceNo))
        {
            return null;
        }
        return petServiceOrderMapper.selectPetServiceOrderByNo(serviceNo.trim());
    }

    /**
     * 客户自助预约：客户在预约页选项目 + 时间 + 联系方式，直接生成一张独立的服务单。
     * 与旧流程的区别：不再需要先选宠物、也不依赖 pet_appointment 落库，宠物信息留空，
     * 客户带着宠物到店后由门店在工单里补录；上门服务则必须填地址。
     */
    @Override
    @Transactional
    public PetServiceOrder createBooking(PetServiceOrder booking, Long userId, String userName)
    {
        if (booking == null || booking.getItemId() == null)
        {
            throw new ServiceException("请选择要预约的服务项目");
        }
        if (userId == null)
        {
            throw new ServiceException("请先登录后再预约");
        }
        PetServiceItem item = petServiceItemMapper.selectPetServiceItemById(booking.getItemId());
        if (item == null || "2".equals(item.getDelFlag()))
        {
            throw new ServiceException("服务项目不存在");
        }
        if ("1".equals(item.getStatus()))
        {
            throw new ServiceException("「" + item.getItemName() + "」已下架，请选择其他项目");
        }

        String mode = StringUtils.isBlank(booking.getServiceMode()) ? "1" : booking.getServiceMode().trim();
        if (!"1".equals(mode) && !"2".equals(mode))
        {
            throw new ServiceException("服务方式只能是到店服务或上门服务");
        }
        String contactName = StringUtils.isBlank(booking.getContactName()) ? null : booking.getContactName().trim();
        if (contactName == null)
        {
            throw new ServiceException("请填写联系人姓名");
        }
        String phone = StringUtils.isBlank(booking.getContactPhone()) ? null : booking.getContactPhone().trim();
        if (phone == null)
        {
            throw new ServiceException("请填写联系电话");
        }
        if (!phone.matches("^1[3-9]\\d{9}$"))
        {
            throw new ServiceException("联系电话格式不正确，请填写 11 位手机号");
        }
        String address = StringUtils.isBlank(booking.getAddress()) ? null : booking.getAddress().trim();
        if ("2".equals(mode))
        {
            if (address == null)
            {
                throw new ServiceException("上门服务需要填写服务地址");
            }
            if (address.length() < 6)
            {
                throw new ServiceException("服务地址太短，请填写详细地址（小区/楼栋/门牌号）");
            }
        }
        if (booking.getAppointTime() == null)
        {
            throw new ServiceException("请选择预约时间");
        }
        if (booking.getAppointTime().getTime() < System.currentTimeMillis() - 60_000L)
        {
            throw new ServiceException("预约时间不能早于当前时间");
        }

        int qty = booking.getQty() == null || booking.getQty() < 1 ? 1 : booking.getQty();
        if (qty > 20)
        {
            throw new ServiceException("单个项目最多预约 20 份");
        }
        BigDecimal price = item.getPrice() == null ? BigDecimal.ZERO : item.getPrice();

        PetServiceOrder order = new PetServiceOrder();
        order.setServiceNo(genServiceNo(null));
        Long storeId = booking.getStoreId() != null ? booking.getStoreId() : item.getStoreId();
        order.setStoreId(storeId == null ? 1L : storeId);
        order.setUserId(userId);
        order.setCustomerName(contactName);
        order.setContactName(contactName);
        order.setContactPhone(phone);
        // 到店服务不需要地址，避免库里留脏数据
        order.setAddress("2".equals(mode) ? address : null);
        order.setServiceMode(mode);
        order.setItemId(item.getItemId());
        order.setItemName(item.getItemName());
        order.setItemType(item.getItemType());
        order.setPrice(price);
        order.setQty(qty);
        order.setTotalAmount(price.multiply(BigDecimal.valueOf(qty)));
        order.setAppointTime(booking.getAppointTime());
        order.setStatus("0");
        order.setPayStatus("0");
        order.setSource("2");
        if (StringUtils.isNotBlank(booking.getRemark()))
        {
            order.setRemark(booking.getRemark().trim());
        }
        order.setCreateBy(StringUtils.isBlank(userName) ? contactName : userName);
        // 关键：不写 petId / petName，预约单与具体宠物解耦
        petServiceOrderMapper.insertPetServiceOrder(order);

        writeLog(order.getServiceId(), null, "0", order.getCreateBy(),
                "客户自助预约「" + item.getItemName() + "」×" + qty + "（" + ("2".equals(mode) ? "上门服务" : "到店服务") + "），待门店接单");
        return order;
    }

    @Override
    @Transactional
    public Map<String, Object> payBooking(String serviceNo, String payMethod, Long userId)
    {
        if (StringUtils.isBlank(serviceNo))
        {
            throw new ServiceException("服务单号不能为空");
        }
        PetServiceOrder order = petServiceOrderMapper.selectPetServiceOrderByNo(serviceNo.trim());
        if (order == null)
        {
            throw new ServiceException("预约单不存在");
        }
        if (userId == null || (order.getUserId() != null && !order.getUserId().equals(userId)))
        {
            throw new ServiceException("只能支付自己的预约单");
        }
        if ("4".equals(order.getStatus()))
        {
            throw new ServiceException("预约已取消，无法支付");
        }
        if ("1".equals(order.getPayStatus()))
        {
            throw new ServiceException("该预约单已支付，无需重复支付");
        }

        int qty = order.getQty() == null || order.getQty() < 1 ? 1 : order.getQty();
        BigDecimal amount = order.getTotalAmount();
        if (amount == null)
        {
            BigDecimal price = order.getPrice() == null ? BigDecimal.ZERO : order.getPrice();
            amount = price.multiply(BigDecimal.valueOf(qty));
        }
        String method = StringUtils.isBlank(payMethod) ? "alipay" : payMethod.trim();
        if (!Arrays.asList("alipay", "wechat", "balance", "free").contains(method))
        {
            throw new ServiceException("不支持支付方式：" + method);
        }

        BigDecimal balance = null;
        boolean deducted = false;
        // 0 元项目（如到店看宠接待）不需要走钱包/第三方通道，直接标记已支付
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
        {
            PetServiceOrder free = new PetServiceOrder();
            free.setServiceId(order.getServiceId());
            free.setPayStatus("1");
            free.setPayMethod("free");
            free.setPayTime(new Date());
            petServiceOrderMapper.updatePetServiceOrder(free);
            recordPay(order, userId, "free", BigDecimal.ZERO, qty, "success", "免费项目，无需支付");
            writeLog(order.getServiceId(), order.getStatus(), order.getStatus(), order.getContactName(), "免费项目，预约直接确认");
            Map<String, Object> freeResult = new LinkedHashMap<>();
            freeResult.put("serviceNo", order.getServiceNo());
            freeResult.put("serviceId", order.getServiceId());
            freeResult.put("amount", BigDecimal.ZERO);
            freeResult.put("payMethod", "free");
            freeResult.put("payMethodText", payMethodText("free"));
            freeResult.put("payTime", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));
            freeResult.put("balance", balance);
            freeResult.put("payStatus", "1");
            return freeResult;
        }
        if ("balance".equals(method))
        {
            balance = petWalletService.getBalance(userId);
            if (!petWalletService.tryDeduct(userId, amount))
            {
                String reason = "余额不足（可用 ¥" + balance + "，本单需 ¥" + amount + "）";
                recordPay(order, userId, method, amount, qty, "fail", reason);
                throw new ServiceException(reason);
            }
            deducted = true;
        }

        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(order.getServiceId());
        update.setPayStatus("1");
        update.setPayMethod(method);
        update.setPayTime(new Date());
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        if (rows <= 0)
        {
            // 支付状态没落库，钱不能扣着不放
            if (deducted)
            {
                petWalletService.refund(userId, amount);
            }
            recordPay(order, userId, method, amount, qty, "fail", "预约单状态更新失败，支付已回滚");
            throw new ServiceException("支付失败，请稍后重试");
        }

        recordPay(order, userId, method, amount, qty, "success",
                "预约支付「" + order.getItemName() + "」×" + qty);
        writeLog(order.getServiceId(), order.getStatus(), order.getStatus(), order.getContactName(),
                "预约已支付 ¥" + amount + "（" + payMethodText(method) + "）");
        if (deducted)
        {
            balance = petWalletService.getBalance(userId);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("serviceNo", order.getServiceNo());
        result.put("serviceId", order.getServiceId());
        result.put("amount", amount);
        result.put("payMethod", method);
        result.put("payMethodText", payMethodText(method));
        result.put("payTime", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));
        result.put("balance", balance);
        result.put("payStatus", "1");
        return result;
    }

    @Override
    @Transactional
    public int cancelBooking(Long serviceId, Long userId, String reason)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if (userId == null || (origin.getUserId() != null && !origin.getUserId().equals(userId)))
        {
            throw new ServiceException("只能取消自己的预约单");
        }
        if ("3".equals(origin.getStatus()))
        {
            throw new ServiceException("服务已完成，无法取消");
        }
        if ("4".equals(origin.getStatus()))
        {
            throw new ServiceException("预约已取消，无需重复操作");
        }
        if ("2".equals(origin.getStatus()))
        {
            throw new ServiceException("服务已开始，请联系门店处理");
        }

        int qty = origin.getQty() == null || origin.getQty() < 1 ? 1 : origin.getQty();
        BigDecimal amount = origin.getTotalAmount();
        if (amount == null)
        {
            BigDecimal price = origin.getPrice() == null ? BigDecimal.ZERO : origin.getPrice();
            amount = price.multiply(BigDecimal.valueOf(qty));
        }
        // 已支付的预约取消：演示环境统一退回平台余额，并留一条退款流水
        if ("1".equals(origin.getPayStatus()) && amount.compareTo(BigDecimal.ZERO) > 0)
        {
            petWalletService.refund(origin.getUserId(), amount);
            recordPay(origin, origin.getUserId(), origin.getPayMethod() == null ? "balance" : origin.getPayMethod(),
                    amount, qty, "success", "取消预约退款 ¥" + amount + "，已退回平台余额");
        }

        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setStatus("4");
        update.setCancelReason(StringUtils.isBlank(reason) ? "客户主动取消" : reason);
        update.setUpdateBy(origin.getContactName());
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        writeLog(serviceId, origin.getStatus(), "4", origin.getContactName(),
                "客户取消预约" + (StringUtils.isBlank(reason) ? "" : "：" + reason)
                        + (amount.compareTo(BigDecimal.ZERO) > 0 && "1".equals(origin.getPayStatus()) ? "，退款 ¥" + amount + " 至余额" : ""));
        return rows;
    }

    @Override
    @Transactional
    public Long createFromAppointment(PetAppointment appointment)
    {
        if (appointment == null || appointment.getAppointmentId() == null)
        {
            return null;
        }
        Long storeId = appointment.getStoreId() == null ? 1L : appointment.getStoreId();
        PetServiceItem item = petServiceItemMapper.selectDefaultReceptionItem(storeId);

        PetServiceOrder order = new PetServiceOrder();
        order.setServiceNo(genServiceNo(appointment.getAppointmentId()));
        order.setAppointmentId(appointment.getAppointmentId());
        order.setStoreId(storeId);
        order.setCustomerId(appointment.getCustomerId());
        order.setUserId(appointment.getUserId());
        order.setCustomerName(appointment.getUserName());
        order.setPetId(appointment.getPetId());
        order.setPetName(appointment.getPetName());
        order.setItemId(item == null ? null : item.getItemId());
        order.setItemName(item == null ? "到店看宠接待" : item.getItemName());
        order.setItemType(item == null ? "6" : item.getItemType());
        order.setPrice(item == null || item.getPrice() == null ? BigDecimal.ZERO : item.getPrice());
        // 旧版按宠物预约也补齐新字段：默认到店、数量 1、总额=单价，联系人取预约里填的
        order.setServiceMode("1");
        order.setQty(1);
        order.setTotalAmount(order.getPrice());
        order.setContactName(appointment.getUserName());
        order.setContactPhone(appointment.getContactPhone());
        order.setAppointTime(appointment.getAppointmentDate());
        order.setStatus("0");
        order.setPayStatus("0");
        order.setSource("1");
        order.setCreateBy(appointment.getCreateBy());
        petServiceOrderMapper.insertPetServiceOrder(order);

        writeLog(order.getServiceId(), null, "0", appointment.getCreateBy(), "预约提交，系统自动生成到店接待工单");
        return order.getServiceId();
    }

    @Override
    @Transactional
    public int dispatch(Long serviceId, Long staffId, String staffName, String operator)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if (!"0".equals(origin.getStatus()) && !"1".equals(origin.getStatus()))
        {
            throw new ServiceException("只有待接单/已接单的工单可以派工");
        }
        if (staffId == null)
        {
            throw new ServiceException("请选择执行员工");
        }
        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setStaffId(staffId);
        update.setStaffName(staffName);
        update.setStatus("1");
        update.setUpdateBy(operator);
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        writeLog(serviceId, origin.getStatus(), "1", operator, "派工给 " + (staffName == null ? staffId : staffName));
        syncAppointment(origin, "1");
        return rows;
    }

    @Override
    @Transactional
    public int start(Long serviceId, String operator)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if (!"1".equals(origin.getStatus()))
        {
            throw new ServiceException("只有已接单的工单可以开始服务");
        }
        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setStatus("2");
        update.setStartTime(new Date());
        update.setUpdateBy(operator);
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        writeLog(serviceId, origin.getStatus(), "2", operator, "开始服务");
        return rows;
    }

    @Override
    @Transactional
    public int finish(Long serviceId, String operator, String remark)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if (!"2".equals(origin.getStatus()) && !"1".equals(origin.getStatus()))
        {
            throw new ServiceException("只有已接单/服务中的工单可以完成");
        }
        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setStatus("3");
        update.setFinishTime(new Date());
        if (origin.getStartTime() == null)
        {
            update.setStartTime(new Date());
        }
        update.setPayStatus("1");
        update.setUpdateBy(operator);
        if (StringUtils.isNotBlank(remark))
        {
            update.setRemark(remark);
        }
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        writeLog(serviceId, origin.getStatus(), "3", operator, StringUtils.isBlank(remark) ? "服务完成，已收费" : remark);
        syncAppointment(origin, "2");
        return rows;
    }

    @Override
    @Transactional
    public int cancel(Long serviceId, String operator, String reason)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if ("3".equals(origin.getStatus()) || "4".equals(origin.getStatus()))
        {
            throw new ServiceException("工单已完成或已取消，不能再次取消");
        }
        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setStatus("4");
        update.setUpdateBy(operator);
        if (StringUtils.isNotBlank(reason))
        {
            update.setRemark(reason);
        }
        int rows = petServiceOrderMapper.updatePetServiceOrder(update);
        writeLog(serviceId, origin.getStatus(), "4", operator, StringUtils.isBlank(reason) ? "工单取消" : reason);
        syncAppointment(origin, "3");
        return rows;
    }

    @Override
    public int evaluate(Long serviceId, Integer score, String comment)
    {
        PetServiceOrder origin = mustGet(serviceId);
        if (!"3".equals(origin.getStatus()))
        {
            throw new ServiceException("服务完成后才能评价");
        }
        if (score == null || score < 1 || score > 5)
        {
            throw new ServiceException("评分需在 1-5 之间");
        }
        PetServiceOrder update = new PetServiceOrder();
        update.setServiceId(serviceId);
        update.setScore(score);
        update.setComment(comment);
        return petServiceOrderMapper.updatePetServiceOrder(update);
    }

    @Override
    public int updatePetServiceOrder(PetServiceOrder order)
    {
        return petServiceOrderMapper.updatePetServiceOrder(order);
    }

    @Override
    public int deletePetServiceOrderByIds(Long[] serviceIds)
    {
        return petServiceOrderMapper.deletePetServiceOrderByIds(serviceIds);
    }

    @Override
    public List<PetServiceLog> selectLogs(Long serviceId)
    {
        return petServiceOrderMapper.selectPetServiceLogs(serviceId);
    }

    @Override
    public Map<String, Object> selectTodayStats(Long storeId)
    {
        String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        List<Map<String, Object>> rows = petServiceOrderMapper.selectStatusCount(storeId, today);
        Map<String, Object> stats = new LinkedHashMap<>();
        int pending = 0, accepted = 0, serving = 0, finished = 0, canceled = 0, missed = 0;
        for (Map<String, Object> row : rows)
        {
            String status = String.valueOf(row.get("status"));
            int cnt = ((Number) row.get("cnt")).intValue();
            switch (status)
            {
                case "0": pending = cnt; break;
                case "1": accepted = cnt; break;
                case "2": serving = cnt; break;
                case "3": finished = cnt; break;
                case "4": canceled = cnt; break;
                case "5": missed = cnt; break;
                default: break;
            }
        }
        stats.put("pending", pending);
        stats.put("accepted", accepted);
        stats.put("serving", serving);
        stats.put("finished", finished);
        stats.put("canceled", canceled);
        stats.put("missed", missed);
        stats.put("total", pending + accepted + serving + finished + canceled + missed);
        stats.put("revenue", petServiceOrderMapper.selectDayRevenue(storeId, today));
        stats.put("staffRank", petServiceOrderMapper.selectStaffRank(storeId, today));
        stats.put("date", today);
        return stats;
    }

    /** 取工单，不存在直接抛异常 */
    private PetServiceOrder mustGet(Long serviceId)
    {
        PetServiceOrder order = petServiceOrderMapper.selectPetServiceOrderById(serviceId);
        if (order == null)
        {
            throw new ServiceException("工单不存在或已被删除");
        }
        return order;
    }

    /** 工单流转同步预约状态，避免"工单完成了、预约还挂着待处理" */
    private void syncAppointment(PetServiceOrder origin, String appointmentStatus)
    {
        if (origin.getAppointmentId() == null)
        {
            return;
        }
        PetAppointment update = new PetAppointment();
        update.setAppointmentId(origin.getAppointmentId());
        update.setStatus(appointmentStatus);
        try
        {
            petAppointmentMapper.updatePetAppointment(update);
        }
        catch (Exception ignored)
        {
            // 预约可能已被前台删除，工单流转不应因此失败
        }
    }

    private void writeLog(Long serviceId, String from, String to, String operator, String remark)
    {
        PetServiceLog log = new PetServiceLog();
        log.setServiceId(serviceId);
        log.setFromStatus(from);
        log.setToStatus(to);
        log.setOperator(StringUtils.isBlank(operator) ? "system" : operator);
        log.setRemark(remark);
        petServiceOrderMapper.insertPetServiceLog(log);
    }

    private String genServiceNo(Long appointmentId)
    {
        String ts = new SimpleDateFormat("yyMMddHHmmss").format(new Date());
        int rnd = ThreadLocalRandom.current().nextInt(100, 1000);
        return "SV" + ts + (appointmentId == null ? "" : String.format("%04d", appointmentId % 10000)) + rnd;
    }

    /** 写支付流水：服务单和商品订单共用 pet_payment_log，order_no 存服务单号 */
    private void recordPay(PetServiceOrder order, Long userId, String payMethod, BigDecimal amount,
                           int qty, String result, String reason)
    {
        try
        {
            PetPaymentLog log = new PetPaymentLog();
            log.setOrderNo(order.getServiceNo());
            log.setUserId(userId);
            log.setUserName(StringUtils.isBlank(order.getCustomerName()) ? order.getContactName() : order.getCustomerName());
            log.setPayMethod(payMethod);
            log.setAmount(amount == null ? 0D : amount.doubleValue());
            log.setItems(qty);
            log.setResult(result);
            log.setReason(reason);
            petPaymentLogService.record(log);
        }
        catch (Exception ignored)
        {
            // 流水只做留痕，写失败不能影响支付主流程
        }
    }

    private String payMethodText(String method)
    {
        if ("balance".equals(method)) return "平台余额";
        if ("wechat".equals(method)) return "微信支付";
        if ("free".equals(method)) return "免费";
        return "支付宝";
    }
}
