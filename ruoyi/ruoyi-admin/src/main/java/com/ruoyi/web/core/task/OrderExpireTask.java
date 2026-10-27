package com.ruoyi.web.core.task;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.ruoyi.system.service.IPetOrderService;

/**
 * 订单超时任务：下单超过 30 分钟未支付的订单自动取消（视为支付失败）
 *
 * 有效期可在 application.yml 用 pet.order.expire-minutes 调整，默认 30 分钟。
 *
 * @author ruoyi
 */
@Component
public class OrderExpireTask
{
    private static final Logger log = LoggerFactory.getLogger(OrderExpireTask.class);

    @Autowired
    private IPetOrderService petOrderService;

    /**
     * 每分钟扫一次超时未支付订单，逐笔自动取消并给用户发站内通知
     */
    @Scheduled(fixedDelay = 60_000, initialDelay = 30_000)
    public void cancelExpiredOrders()
    {
        try
        {
            int n = petOrderService.expireUnpaidOrders();
            if (n > 0)
            {
                log.info("[订单超时] 自动取消 {} 笔超时未支付订单", n);
            }
        }
        catch (Exception e)
        {
            log.error("[订单超时] 自动取消失败", e);
        }
    }
}
