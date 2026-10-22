package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.domain.PetServiceLog;
import com.ruoyi.system.domain.PetServiceOrder;

/**
 * 服务工单 服务层
 *
 * @author ruoyi
 */
public interface IPetServiceOrderService
{
    public List<PetServiceOrder> selectPetServiceOrderList(PetServiceOrder order);

    public PetServiceOrder selectPetServiceOrderById(Long serviceId);

    /** 预约提交后自动生成到店接待工单 */
    public Long createFromAppointment(PetAppointment appointment);

    /** 接单/派单：绑定执行员工 */
    public int dispatch(Long serviceId, Long staffId, String staffName, String operator);

    /** 开始服务 */
    public int start(Long serviceId, String operator);

    /** 完成服务（含收费） */
    public int finish(Long serviceId, String operator, String remark);

    /** 取消工单 */
    public int cancel(Long serviceId, String operator, String reason);

    /** 客户评价 */
    public int evaluate(Long serviceId, Integer score, String comment);

    public int updatePetServiceOrder(PetServiceOrder order);

    public int deletePetServiceOrderByIds(Long[] serviceIds);

    public List<PetServiceLog> selectLogs(Long serviceId);

    /** 今日概览：各状态数量、营收、员工排行 */
    public Map<String, Object> selectTodayStats(Long storeId);
}
