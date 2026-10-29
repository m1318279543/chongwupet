package com.ruoyi.system.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI 助手配置
 *
 * provider=local 时不调用远程模型，直接用检索结果 + 业务数据生成回答，
 * 保证没有 API Key 的环境也能完整跑通；配好 Key 后切到 openai 即可。
 *
 * @author ruoyi
 */
@Component
@ConfigurationProperties(prefix = "pet.ai")
public class AiProperties
{
    /** 总开关 */
    private boolean enabled = true;

    /** local | openai（OpenAI 兼容协议） */
    private String provider = "local";

    /** 接口地址，例如 https://api.deepseek.com/v1 */
    private String baseUrl = "";

    /** API Key，建议用环境变量注入 */
    private String apiKey = "";

    /** 模型名 */
    private String model = "deepseek-chat";

    /** 单次请求超时（秒） */
    private int timeout = 45;

    /** 每 IP 每分钟请求上限 */
    private int ratePerMinute = 20;

    /** 生成温度 */
    private double temperature = 0.3;

    /** 带给模型的历史轮数 */
    private int maxHistory = 6;

    /** 知识召回条数 */
    private int knowledgeLimit = 4;

    public boolean isEnabled()
    {
        return enabled;
    }

    public void setEnabled(boolean enabled)
    {
        this.enabled = enabled;
    }

    public String getProvider()
    {
        return provider;
    }

    public void setProvider(String provider)
    {
        this.provider = provider;
    }

    public String getBaseUrl()
    {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl)
    {
        this.baseUrl = baseUrl;
    }

    public String getApiKey()
    {
        return apiKey;
    }

    public void setApiKey(String apiKey)
    {
        this.apiKey = apiKey;
    }

    public String getModel()
    {
        return model;
    }

    public void setModel(String model)
    {
        this.model = model;
    }

    public int getTimeout()
    {
        return timeout;
    }

    public void setTimeout(int timeout)
    {
        this.timeout = timeout;
    }

    public int getRatePerMinute()
    {
        return ratePerMinute;
    }

    public void setRatePerMinute(int ratePerMinute)
    {
        this.ratePerMinute = ratePerMinute;
    }

    public double getTemperature()
    {
        return temperature;
    }

    public void setTemperature(double temperature)
    {
        this.temperature = temperature;
    }

    public int getMaxHistory()
    {
        return maxHistory;
    }

    public void setMaxHistory(int maxHistory)
    {
        this.maxHistory = maxHistory;
    }

    public int getKnowledgeLimit()
    {
        return knowledgeLimit;
    }

    public void setKnowledgeLimit(int knowledgeLimit)
    {
        this.knowledgeLimit = knowledgeLimit;
    }
}
