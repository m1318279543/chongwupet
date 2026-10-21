package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetPaymentLog;

/**
 * 支付流水 数据层
 *
 * @author ruoyi
 */
public interface PetPaymentLogMapper
{
    /** 新增支付流水 */
    int insertPaymentLog(PetPaymentLog log);

    /** 条件查询流水 */
    List<PetPaymentLog> selectPaymentLogList(PetPaymentLog log);

    /** 按订单号取最近一条流水 */
    PetPaymentLog selectLatestByOrderNo(String orderNo);

    /** 支付总览：订单维度统计（已支付/待支付/失败/取消） */
    Map<String, Object> selectOrderOverview();

    /** 近 N 天每日支付成功/失败量（趋势用） */
    List<Map<String, Object>> selectDailyTrend(Integer days);
}
