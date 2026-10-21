package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetPaymentLog;

/**
 * 支付流水 服务层
 *
 * @author ruoyi
 */
public interface IPetPaymentLogService
{
    /** 条件查询 */
    List<PetPaymentLog> selectPaymentLogList(PetPaymentLog log);

    /**
     * 记录一次支付尝试（成功/失败）。
     * 内部吞掉异常：流水写失败不能影响支付主流程。
     */
    void record(PetPaymentLog log);

    /** 订单维度总览 */
    Map<String, Object> selectOrderOverview();

    /** 近 N 天支付趋势 */
    List<Map<String, Object>> selectDailyTrend(int days);
}
