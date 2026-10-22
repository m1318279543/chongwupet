package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetRefund;

/**
 * 退款 服务层
 *
 * @author ruoyi
 */
public interface IPetRefundService
{
    public List<PetRefund> selectPetRefundList(PetRefund refund);

    public PetRefund selectPetRefundById(Long refundId);

    /**
     * 用户申请退款。
     * 只有「已支付且未取消」的订单可以申请，同一订单不能有两条待审核。
     */
    public PetRefund apply(String orderNo, String reason, Long userId, String userName);

    /**
     * 后台审核。
     * 通过：订单置「已退款 + 已取消」，商品回补库存、宠物放回在售，
     *      库存流水记 change_type=5（退款入库），与取消回补的 3 区分。
     * 拒绝：只改退款单状态，订单不动。
     */
    public int audit(Long refundId, boolean pass, String remark, String operator);

    /** 我的退款记录 */
    public List<PetRefund> selectMyRefunds(Long userId);

    /** 今日概览 */
    public Map<String, Object> selectTodayStats(Long storeId);
}
