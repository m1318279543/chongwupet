package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetServiceLog;
import com.ruoyi.system.domain.PetServiceOrder;

/**
 * 服务工单 Mapper
 *
 * @author ruoyi
 */
public interface PetServiceOrderMapper
{
    public List<PetServiceOrder> selectPetServiceOrderList(PetServiceOrder order);

    public PetServiceOrder selectPetServiceOrderById(Long serviceId);

    /** 按服务单号查询（预约独立下单） */
    public PetServiceOrder selectPetServiceOrderByNo(String serviceNo);

    public int insertPetServiceOrder(PetServiceOrder order);

    public int updatePetServiceOrder(PetServiceOrder order);

    public int deletePetServiceOrderByIds(Long[] serviceIds);

    /** 工单状态流水 */
    public int insertPetServiceLog(PetServiceLog log);

    public List<PetServiceLog> selectPetServiceLogs(Long serviceId);

    /** 按门店统计各状态工单数（status -> count） */
    public List<Map<String, Object>> selectStatusCount(@Param("storeId") Long storeId, @Param("date") String date);

    /** 某门店某天的工单营收合计 */
    public java.math.BigDecimal selectDayRevenue(@Param("storeId") Long storeId, @Param("date") String date);

    /** 按执行员工统计今天完成的工单（业绩排行） */
    public List<Map<String, Object>> selectStaffRank(@Param("storeId") Long storeId, @Param("date") String date);
}
