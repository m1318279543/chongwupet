package com.ruoyi.system.service;

import java.math.BigDecimal;

/**
 * 用户钱包 服务层
 *
 * @author ruoyi
 */
public interface IPetWalletService
{
    /** 查询余额（钱包不存在时自动建 0 元并返回 0） */
    BigDecimal getBalance(Long userId);

    /** 尝试扣款：成功返回 true，余额不足返回 false */
    boolean tryDeduct(Long userId, BigDecimal amount);

    /** 退款（支付失败回滚时使用） */
    void refund(Long userId, BigDecimal amount);

    /** 充值（演示环境模拟充值），返回充值后余额 */
    BigDecimal recharge(Long userId, BigDecimal amount);
}
