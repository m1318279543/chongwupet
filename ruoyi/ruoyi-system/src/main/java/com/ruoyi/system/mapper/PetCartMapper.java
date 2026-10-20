package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetCart;

/**
 * 购物车管理 数据层
 *
 * @author ruoyi
 */
public interface PetCartMapper
{
    public List<PetCart> selectPetCartList(PetCart petCart);

    public PetCart selectPetCartByCartId(Long cartId);

    public int insertPetCart(PetCart petCart);

    public int deletePetCartByCartId(Long cartId);

    public int deletePetCartByCartIds(Long[] cartIds);

    /** 修改订单状态（取消订单等） */
    public int updatePetCartStatus(@Param("cartId") Long cartId, @Param("status") String status);
}
