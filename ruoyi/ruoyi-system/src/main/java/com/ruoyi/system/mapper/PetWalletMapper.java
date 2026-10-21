package com.ruoyi.system.mapper;

import java.math.BigDecimal;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetWallet;

/**
 * 用户钱包 数据层
 *
 * @author ruoyi
 */
public interface PetWalletMapper
{
    /** 查询钱包（可能为 null） */
    PetWallet selectByUserId(Long userId);

    /** 确保钱包行存在（不存在则插入 0 元） */
    int ensureWallet(Long userId);

    /** 增加余额（充值/退款） */
    int increaseBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount);

    /** 扣减余额：余额不足时影响行数为 0，天然防并发超扣 */
    int decreaseBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount);
}
