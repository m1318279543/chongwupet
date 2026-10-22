package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetRefund;

/**
 * 退款单 数据层
 *
 * @author ruoyi
 */
public interface PetRefundMapper
{
    public List<PetRefund> selectPetRefundList(PetRefund refund);

    public PetRefund selectPetRefundById(Long refundId);

    /** 同一订单是否已有待审核的退款单 */
    public int countPendingByOrderNo(String orderNo);

    public int insertPetRefund(PetRefund refund);

    public int updatePetRefund(PetRefund refund);

    /** 今日概览：待审核数、今日退款额 */
    public java.util.Map<String, Object> selectTodayStats(Long storeId, String date);
}
