package com.ruoyi.system.ai;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.utils.StringUtils;

/**
 * 模型网关：统一走 OpenAI 兼容协议，可在 Pollinations / 豆包 / 通义 / Kimi / DeepSeek 之间切换。
 *
 * 默认接入 Pollinations AI（https://text.pollinations.ai/v1）：
 * 完全免费、无需 API Key。apiKey 留空时不携带 Authorization 头；
 * 配了 Key 的商业模型仍然兼容。
 *
 * 未配置 base-url 时 available() 返回 false，编排层会退化为"检索 + 模板"，
 * 不会发起任何网络请求。
 *
 * @author ruoyi
 */
@Component
public class LlmClient
{
    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private AiProperties properties;

    private volatile HttpClient client;

    /** 是否具备远程生成能力（Pollinations 等免费通道无需 API Key，只要配了地址即可） */
    public boolean available()
    {
        return properties.isEnabled()
                && "openai".equalsIgnoreCase(properties.getProvider())
                && StringUtils.isNotBlank(properties.getBaseUrl());
    }

    public String providerName()
    {
        return available() ? ("openai:" + properties.getModel()) : "local";
    }

    /**
     * 生成回答。onDelta 不为空时按流式回调；返回完整文本。
     * 远程失败会抛出异常，由调用方决定降级方式。
     */
    public String chat(List<Map<String, String>> messages, Consumer<String> onDelta) throws Exception
    {
        if (!available())
        {
            throw new IllegalStateException("远程模型未启用");
        }
        boolean stream = onDelta != null;

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getModel());
        body.put("messages", messages);
        body.put("temperature", properties.getTemperature());
        body.put("stream", stream);
        // 压推理耗时：gpt-oss 系模型 low 档首字 ~5s（默认 ~25s）；不支持的供应商会忽略
        if (StringUtils.isNotBlank(properties.getReasoningEffort()))
        {
            body.put("reasoning_effort", properties.getReasoningEffort());
        }
        if (properties.getMaxTokens() > 0)
        {
            body.put("max_tokens", properties.getMaxTokens());
        }

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(stripSlash(properties.getBaseUrl()) + "/chat/completions"))
                .timeout(Duration.ofSeconds(Math.max(10, properties.getTimeout())))
                .header("Content-Type", "application/json")
                // 固定 UA，避免免密钥通道偶发 403
                .header("User-Agent", "PetHome-RuoYi/1.0")
                .POST(HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body), StandardCharsets.UTF_8));
        // 仅在配置了 Key 时携带鉴权头（Pollinations 免密钥通道不带）
        if (StringUtils.isNotBlank(properties.getApiKey()))
        {
            builder.header("Authorization", "Bearer " + properties.getApiKey());
        }
        HttpRequest request = builder.build();

        HttpResponse<java.io.InputStream> response = client().send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() < 200 || response.statusCode() >= 300)
        {
            String text = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
            throw new IllegalStateException("模型接口返回 " + response.statusCode() + "：" + abbreviate(text, 200));
        }
        if (!stream)
        {
            JsonNode root = JSON.readTree(response.body());
            return text(root.path("choices").path(0).path("message").path("content"));
        }
        return readStream(response.body(), onDelta);
    }

    /** 同步生成，不含流式回调 */
    public String chat(List<Map<String, String>> messages) throws Exception
    {
        return chat(messages, null);
    }

    private String readStream(java.io.InputStream in, Consumer<String> onDelta) throws Exception
    {
        StringBuilder full = new StringBuilder();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(in, StandardCharsets.UTF_8)))
        {
            String line;
            while ((line = reader.readLine()) != null)
            {
                if (!line.startsWith("data:"))
                {
                    continue;
                }
                String payload = line.substring(5).trim();
                if (payload.isEmpty() || "[DONE]".equals(payload))
                {
                    continue;
                }
                try
                {
                    JsonNode node = JSON.readTree(payload);
                    String delta = text(node.path("choices").path(0).path("delta").path("content"));
                    if (StringUtils.isNotEmpty(delta))
                    {
                        full.append(delta);
                        onDelta.accept(delta);
                    }
                }
                catch (Exception ignore)
                {
                    // 单行解析失败不影响整体流
                }
            }
        }
        return full.toString();
    }

    private HttpClient client()
    {
        if (client == null)
        {
            synchronized (this)
            {
                if (client == null)
                {
                    client = HttpClient.newBuilder()
                            .connectTimeout(Duration.ofSeconds(10))
                            .followRedirects(HttpClient.Redirect.NORMAL)
                            .build();
                }
            }
        }
        return client;
    }

    private static String text(JsonNode node)
    {
        return node == null || node.isMissingNode() || node.isNull() ? "" : node.asText("");
    }

    private static String stripSlash(String url)
    {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String abbreviate(String text, int max)
    {
        if (text == null)
        {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    /** 供编排层构造消息 */
    public static Map<String, String> msg(String role, String content)
    {
        Map<String, String> one = new LinkedHashMap<>();
        one.put("role", role);
        one.put("content", content == null ? "" : content);
        return one;
    }

    /** 过滤空消息 */
    public static List<Map<String, String>> clean(List<Map<String, String>> messages)
    {
        List<Map<String, String>> list = new ArrayList<>();
        if (messages == null)
        {
            return list;
        }
        for (Map<String, String> m : messages)
        {
            if (m != null && StringUtils.isNotBlank(m.get("content")))
            {
                list.add(m);
            }
        }
        return list;
    }
}
