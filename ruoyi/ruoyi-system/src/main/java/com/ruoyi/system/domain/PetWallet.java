package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;

/**
 * 用户钱包 pet_wallet
 * 平台余额支付通道的真实余额来源。
 *
 * @author ruoyi
 */
public class PetWallet
{
    /** 用户ID */
    private Long userId;

    /** 可用余额 */
    private BigDecimal balance;

    /** 更新时间 */
    private Date updateTime;

    public Long getUserId()
    {
        return userId;
    }

    public void setUserId(Long userId)
    {
        this.userId = userId;
    }

    public BigDecimal getBalance()
    {
        return balance;
    }

    public void setBalance(BigDecimal balance)
    {
        this.balance = balance;
    }

    public Date getUpdateTime()
    {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime)
    {
        this.updateTime = updateTime;
    }
}
