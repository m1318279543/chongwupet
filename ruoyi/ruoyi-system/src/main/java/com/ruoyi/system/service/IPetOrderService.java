package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetCart;
import com.ruoyi.system.domain.PetOrder;

/**
 * 订单 服务层
 *
 * @author ruoyi
 */
public interface IPetOrderService
{
    public List<PetOrder> selectPetOrderList(PetOrder order);

    /** 订单详情（含明细） */
    public PetOrder selectPetOrderByNo(String orderNo);

    /**
     * 提交订单：定价、扣库存、写订单头与明细，一次事务完成
     *
     * @param items 申请下单的行（只需 goodsId/skuId/qty，价格不采信）
     */
    public PetOrder createOrder(List<PetCart> items, Long userId, String userName);

    /**
     * 宠物下单：一只一单，下单即用 CAS 抢占 pet_info.status。
     * 已被订走时抛业务异常，避免同一只宠物卖两次。
     */
    public PetOrder createPetOrder(Long petId, Long userId, String userName);

    /** 支付：幂等，已支付不会重复写 */
    public int payOrder(String orderNo, String payMethod, String operator);

    /** 取消：回补库存并写取消记录 */
    public int cancelOrder(String orderNo, String reason, String operator);

    /** 发货/确认完成 */
    public int shipOrder(String orderNo, String operator);

    public int deletePetOrderByNos(String[] orderNos);

    public List<PetOrder> selectMyOrders(Long userId);

    /** 今日订单概览 */
    public Map<String, Object> selectTodayStats(Long storeId);
}
