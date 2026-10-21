package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetWallet;
import com.ruoyi.system.mapper.PetWalletMapper;
import com.ruoyi.system.service.IPetWalletService;

/**
 * 用户钱包 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetWalletServiceImpl implements IPetWalletService
{
    @Autowired
    private PetWalletMapper walletMapper;

    @Override
    public BigDecimal getBalance(Long userId)
    {
        if (userId == null) return BigDecimal.ZERO;
        PetWallet w = walletMapper.selectByUserId(userId);
        if (w == null)
        {
            // 首次使用自动建户，避免前台报"钱包不存在"
            walletMapper.ensureWallet(userId);
            return BigDecimal.ZERO;
        }
        return w.getBalance() == null ? BigDecimal.ZERO : w.getBalance();
    }

    @Override
    public boolean tryDeduct(Long userId, BigDecimal amount)
    {
        if (userId == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return false;
        walletMapper.ensureWallet(userId);
        return walletMapper.decreaseBalance(userId, amount) > 0;
    }

    @Override
    public void refund(Long userId, BigDecimal amount)
    {
        if (userId == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        walletMapper.increaseBalance(userId, amount);
    }

    @Override
    public BigDecimal recharge(Long userId, BigDecimal amount)
    {
        walletMapper.ensureWallet(userId);
        walletMapper.increaseBalance(userId, amount);
        return getBalance(userId);
    }
}
