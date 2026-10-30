package com.ruoyi.system.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI 助手配置
 *
 * 默认接入 Pollinations AI（免费、无需 API Key）：provider=openai + base-url 即可。
 * provider=local 时不调用远程模型，直接用检索结果 + 业务数据生成回答；
 * 换商业模型（豆包/通义/Kimi/DeepSeek）填 apiKey 即可，协议完全一致。
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
    private String provider = "openai";

    /** 接口地址，默认 Pollinations 免费通道；商业模型如 https://api.deepseek.com/v1 */
    private String baseUrl = "https://text.pollinations.ai/v1";

    /** API Key，建议用环境变量注入；免费通道留空即可 */
    private String apiKey = "";

    /** 模型名 */
    private String model = "openai";

    /** 单次请求超时（秒） */
    private int timeout = 45;

    /** 每 IP 每分钟请求上限 */
    private int ratePerMinute = 20;

    /** 生成温度 */
    private double temperature = 0.3;

    /** 推理力度：low 可把 gpt-oss 系推理模型的首字时间从 ~25s 压到 ~5s；商业模型一般忽略该参数 */
    private String reasoningEffort = "low";

    /** 单次回复最大 token 数，0 不限制 */
    private int maxTokens = 600;

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

    public String getReasoningEffort()
    {
        return reasoningEffort;
    }

    public void setReasoningEffort(String reasoningEffort)
    {
        this.reasoningEffort = reasoningEffort;
    }

    public int getMaxTokens()
    {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens)
    {
        this.maxTokens = maxTokens;
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
