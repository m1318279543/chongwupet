package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.domain.PetOrderItem;

/**
 * 订单 Mapper
 *
 * @author ruoyi
 */
public interface PetOrderMapper
{
    public List<PetOrder> selectPetOrderList(PetOrder order);

    public PetOrder selectPetOrderByNo(@Param("orderNo") String orderNo);

    public List<PetOrderItem> selectItemsByOrderNo(@Param("orderNo") String orderNo);

    public List<PetOrderItem> selectItemsByOrderIds(@Param("orderIds") List<Long> orderIds);

    public int insertPetOrder(PetOrder order);

    public int insertPetOrderItem(PetOrderItem item);

    public int updatePetOrder(PetOrder order);

    /** 支付：带 pay_status='0' 条件，重复支付不会改数据 */
    public int payOrder(@Param("orderNo") String orderNo, @Param("payMethod") String payMethod);

    public int deletePetOrderByNos(@Param("orderNos") String[] orderNos);

    /** 今日订单数 / 已付金额 */
    public List<Map<String, Object>> selectTodayStats(@Param("storeId") Long storeId, @Param("date") String date);
}
