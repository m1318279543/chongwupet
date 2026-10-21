package com.ruoyi.system.service.impl;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetPaymentLog;
import com.ruoyi.system.mapper.PetPaymentLogMapper;
import com.ruoyi.system.service.IPetPaymentLogService;

/**
 * 支付流水 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetPaymentLogServiceImpl implements IPetPaymentLogService
{
    private static final Logger log = LoggerFactory.getLogger(PetPaymentLogServiceImpl.class);

    @Autowired
    private PetPaymentLogMapper paymentLogMapper;

    @Override
    public List<PetPaymentLog> selectPaymentLogList(PetPaymentLog paymentLog)
    {
        return paymentLogMapper.selectPaymentLogList(paymentLog);
    }

    @Override
    public void record(PetPaymentLog paymentLog)
    {
        try
        {
            if (paymentLog.getResult() == null || paymentLog.getResult().isEmpty())
            {
                paymentLog.setResult("fail");
            }
            paymentLogMapper.insertPaymentLog(paymentLog);
        }
        catch (Exception e)
        {
            // 流水只是旁路记录，绝不因为写日志失败影响支付结果
            log.warn("支付流水写入失败 orderNo={} result={}: {}", paymentLog.getOrderNo(), paymentLog.getResult(), e.getMessage());
        }
    }

    @Override
    public Map<String, Object> selectOrderOverview()
    {
        return paymentLogMapper.selectOrderOverview();
    }

    @Override
    public List<Map<String, Object>> selectDailyTrend(int days)
    {
        return paymentLogMapper.selectDailyTrend(days <= 0 ? 7 : days);
    }
}
