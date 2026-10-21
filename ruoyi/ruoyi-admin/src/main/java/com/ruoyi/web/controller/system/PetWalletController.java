package com.ruoyi.web.controller.system;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.service.IPetWalletService;

/**
 * 用户钱包（平台余额通道）
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/wallet")
public class PetWalletController extends BaseController
{
    @Autowired
    private IPetWalletService walletService;

    /** 我的余额 */
    @GetMapping("/mine")
    public AjaxResult mine()
    {
        Long userId = SecurityUtils.getUserId();
        Map<String, Object> data = new HashMap<>();
        data.put("balance", walletService.getBalance(userId));
        return success(data);
    }

    /**
     * 模拟充值：演示环境不接真实支付，用于验证余额充足/不足两种结果。
     * 单次限额 0.01 ~ 10000 元。
     */
    @PostMapping("/recharge")
    public AjaxResult recharge(@RequestBody(required = false) Map<String, Object> body)
    {
        if (body == null || body.get("amount") == null)
        {
            return error("请输入充值金额");
        }
        BigDecimal amount;
        try
        {
            amount = new BigDecimal(String.valueOf(body.get("amount")));
        }
        catch (Exception e)
        {
            return error("充值金额格式不正确");
        }
        if (amount.compareTo(new BigDecimal("0.01")) < 0)
        {
            return error("充值金额至少 0.01 元");
        }
        if (amount.compareTo(new BigDecimal("10000")) > 0)
        {
            return error("单次充值不能超过 10000 元");
        }
        Long userId = SecurityUtils.getUserId();
        BigDecimal after = walletService.recharge(userId, amount);
        Map<String, Object> data = new HashMap<>();
        data.put("balance", after);
        data.put("amount", amount);
        return AjaxResult.success("充值成功（演示环境）", data);
    }
}
