package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetCart;

/**
 * 购物车管理 服务层
 *
 * @author ruoyi
 */
public interface IPetCartService
{
    public List<PetCart> selectPetCartList(PetCart petCart);

    public PetCart selectPetCartByCartId(Long cartId);

    public int insertPetCart(PetCart petCart);

    public int deletePetCartByCartIds(Long[] cartIds);

    public int deletePetCartByCartId(Long cartId);

    /**
     * 取消订单：把订单状态置为已取消，并写入取消记录
     * @return 取消后的状态说明（成功返回 null 表示无异常）
     */
    public void cancelPetCart(Long cartId, String reason, Long operatorUserId, String operatorName);

    /**
     * 模拟支付：按订单号把该用户名下待支付订单置为已支付
     * @return 实际支付的商品件数
     */
    public int payOrder(String orderNo, Long userId, String payMethod);
}
