package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
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
import com.ruoyi.system.domain.PetServiceItem;
import com.ruoyi.system.domain.PetServiceLog;
import com.ruoyi.system.domain.PetServiceOrder;
import com.ruoyi.system.mapper.PetAppointmentMapper;
import com.ruoyi.system.mapper.PetServiceItemMapper;
import com.ruoyi.system.mapper.PetServiceOrderMapper;
import com.ruoyi.system.service.IPetServiceOrderService;

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
}
