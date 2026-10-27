package com.ruoyi.system.ai;

import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.ruoyi.common.core.redis.RedisCache;
import com.ruoyi.common.utils.StringUtils;

/**
 * AI 入口治理：限流、急症识别、日志脱敏。
 *
 * 急症判断放在编排层前置执行，不交给模型——模型可能给出不恰当的家庭处理建议。
 *
 * @author ruoyi
 */
@Component
public class AiGuard
{
    private static final String RATE_KEY = "pet:ai:rate:";

    /** 需要立即就医的红旗信号 */
    private static final String[] EMERGENCY_WORDS = {
            "尿不出来", "尿闭", "无尿", "抽搐", "中毒", "误食", "吃了老鼠药", "便血", "血便", "吐血",
            "呼吸困难", "张口呼吸", "难产", "中暑", "昏厥", "昏迷", "瘫痪", "大出血", "窒息", "卡住"
    };

    @Autowired
    private RedisCache redisCache;

    @Autowired
    private AiProperties properties;

    /** 每 IP 每分钟限流；Redis 异常时放行，不影响主流程 */
    public boolean limited(String ip)
    {
        if (StringUtils.isBlank(ip))
        {
            ip = "unknown";
        }
        String key = RATE_KEY + ip;
        try
        {
            Integer count = redisCache.getCacheObject(key);
            if (count == null)
            {
                redisCache.setCacheObject(key, 1, 60, TimeUnit.SECONDS);
                return false;
            }
            if (count >= properties.getRatePerMinute())
            {
                return true;
            }
            redisCache.setCacheObject(key, count + 1, 60, TimeUnit.SECONDS);
        }
        catch (Exception ignore)
        {
            return false;
        }
        return false;
    }

    /** 命中任一红旗信号即返回该词，否则 null */
    public String emergencyWord(String text)
    {
        if (StringUtils.isBlank(text))
        {
            return null;
        }
        for (String word : EMERGENCY_WORDS)
        {
            if (text.contains(word))
            {
                return word;
            }
        }
        return null;
    }

    /** 日志脱敏：手机号、身份证号 */
    public String mask(String text)
    {
        if (StringUtils.isBlank(text))
        {
            return text;
        }
        String value = text.replaceAll("(1[3-9]\\d)\\d{4}(\\d{4})", "$1****$2");
        return value.replaceAll("(\\d{6})\\d{8}(\\d{4})", "$1********$2");
    }
}
