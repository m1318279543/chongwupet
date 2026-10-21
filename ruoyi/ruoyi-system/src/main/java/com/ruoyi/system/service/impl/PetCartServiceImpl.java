package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.PetCancelRecord;
import com.ruoyi.system.domain.PetCart;
import com.ruoyi.system.mapper.PetCartMapper;
import com.ruoyi.system.service.IPetCancelRecordService;
import com.ruoyi.system.service.IPetCartService;

/**
 * 购物车管理 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetCartServiceImpl implements IPetCartService
{
    @Autowired
    private PetCartMapper petCartMapper;

    @Autowired
    private IPetCancelRecordService petCancelRecordService;

    @Override
    public List<PetCart> selectPetCartList(PetCart petCart)
    {
        return petCartMapper.selectPetCartList(petCart);
    }

    @Override
    public PetCart selectPetCartByCartId(Long cartId)
    {
        return petCartMapper.selectPetCartByCartId(cartId);
    }

    @Override
    public int payOrder(String orderNo, Long userId, String payMethod)
    {
        if (orderNo == null || orderNo.isEmpty() || userId == null)
        {
            throw new ServiceException("订单号缺失，无法支付");
        }
        return petCartMapper.updatePayStatus(orderNo, userId, payMethod);
    }

    @Override
    public int insertPetCart(PetCart petCart)
    {
        if (petCart.getStatus() == null || petCart.getStatus().isEmpty())
        {
            petCart.setStatus("0");
        }
        return petCartMapper.insertPetCart(petCart);
    }

    @Override
    public int deletePetCartByCartIds(Long[] cartIds)
    {
        return petCartMapper.deletePetCartByCartIds(cartIds);
    }

    @Override
    public int deletePetCartByCartId(Long cartId)
    {
        return petCartMapper.deletePetCartByCartId(cartId);
    }

    @Override
    @Transactional
    public void cancelPetCart(Long cartId, String reason, Long operatorUserId, String operatorName)
    {
        PetCart cart = petCartMapper.selectPetCartByCartId(cartId);
        if (cart == null)
        {
            throw new ServiceException("订单不存在或已被删除");
        }
        if ("3".equals(cart.getStatus()))
        {
            throw new ServiceException("该订单已取消，无需重复操作");
        }
        // 1. 订单置为已取消
        petCartMapper.updatePetCartStatus(cartId, "3");
        // 2. 写入取消记录（保留快照，供后台查看）
        PetCancelRecord record = new PetCancelRecord();
        record.setTargetType("order");
        record.setRefId(cartId);
        record.setUserId(cart.getUserId());
        record.setUserName(cart.getUserName());
        record.setTargetName(cart.getGoodsName());
        record.setDetail(buildOrderDetail(cart));
        record.setReason(reason == null ? "" : reason);
        record.setCreateBy(operatorName);
        petCancelRecordService.insertPetCancelRecord(record);
    }

    /** 组装订单明细快照 */
    private String buildOrderDetail(PetCart cart)
    {
        StringBuilder sb = new StringBuilder();
        if (cart.getGoodsSpec() != null && !cart.getGoodsSpec().isEmpty())
        {
            sb.append("规格：").append(cart.getGoodsSpec()).append("；");
        }
        sb.append("单价：¥").append(cart.getPrice() == null ? "0" : cart.getPrice());
        sb.append("；数量：").append(cart.getQty() == null ? 0 : cart.getQty());
        Double amount = cart.getAmount();
        if (amount == null && cart.getPrice() != null && cart.getQty() != null)
        {
            amount = cart.getPrice() * cart.getQty();
        }
        sb.append("；小计：¥").append(amount == null ? "0" : amount);
        return sb.toString();
    }
}
