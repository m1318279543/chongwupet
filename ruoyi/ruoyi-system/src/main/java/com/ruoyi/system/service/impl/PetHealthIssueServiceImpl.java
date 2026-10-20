package com.ruoyi.system.service.impl;

import java.net.InetSocketAddress;
import java.net.ProxySelector;
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
import java.util.AbstractMap;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetHealthIssue;
import com.ruoyi.system.mapper.PetHealthIssueMapper;
import com.ruoyi.system.service.IPetHealthIssueService;

/**
 * 宠物常见健康问题 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetHealthIssueServiceImpl implements IPetHealthIssueService
{
    private static final Logger log = LoggerFactory.getLogger(PetHealthIssueServiceImpl.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private PetHealthIssueMapper petHealthIssueMapper;

    @Autowired
    private com.ruoyi.system.mapper.PetCategoryMapper petCategoryMapper;

    // 在线模型（OpenAI 兼容 /chat/completions 协议，默认豆包/火山方舟）配置
    @Value("${llm.enabled:true}")
    private boolean llmEnabled;

    @Value("${llm.base-url:https://ark.cn-beijing.volces.com/api/v3}")
    private String llmBaseUrl;

    // API Key：优先读环境变量 LLM_API_KEY，避免把密钥写进配置文件/误提交到仓库
    @Value("${llm.api-key:${LLM_API_KEY:}}")
    private String llmApiKey;

    @Value("${llm.model:}")
    private String llmModel;

    // 单次问答超时（秒）
    @Value("${llm.timeout:60}")
    private int llmTimeout;

    // 免费端点限流保护：两次调用最小间隔，避免高频点击触发 Pollinations 降级返回无关兜底文本
    private static final long MIN_CALL_INTERVAL_MS = 3500L;
    private static long lastCallTs = 0L;

    // 科系关键词识别：提问中出现这些字时，优先匹配对应科系
    private static final Map<String, String> FAMILY_HINT = new LinkedHashMap<>();
    static {
        FAMILY_HINT.put("猫", "猫科");
        FAMILY_HINT.put("狗", "犬科");
        FAMILY_HINT.put("犬", "犬科");
        FAMILY_HINT.put("兔", "兔科");
        FAMILY_HINT.put("仓鼠", "鼠科");
        FAMILY_HINT.put("鼠", "鼠科");
        FAMILY_HINT.put("鸟", "鹦鹉科");
        FAMILY_HINT.put("鹦鹉", "鹦鹉科");
        FAMILY_HINT.put("鱼", "观赏鱼科");
        FAMILY_HINT.put("龟", "爬行科");
        FAMILY_HINT.put("蜥", "爬行科");
        FAMILY_HINT.put("爬", "爬行科");
        FAMILY_HINT.put("蛇", "爬行科");
    }

    @Override
    public List<PetHealthIssue> selectPetHealthIssueList(PetHealthIssue petHealthIssue)
    {
        return petHealthIssueMapper.selectPetHealthIssueList(petHealthIssue);
    }

    @Override
    public List<PetHealthIssue> selectPetHealthIssueFront(PetHealthIssue petHealthIssue)
    {
        // 仅传分类时，按该分类的科系匹配知识库
        if (petHealthIssue.getCategoryId() != null && StringUtils.isBlank(petHealthIssue.getFamily()))
        {
            com.ruoyi.system.domain.PetCategory cat = petCategoryMapper.selectPetCategoryByCategoryId(petHealthIssue.getCategoryId());
            if (cat != null && StringUtils.isNotBlank(cat.getFamily()))
            {
                petHealthIssue.setFamily(cat.getFamily());
            }
        }
        return petHealthIssueMapper.selectPetHealthIssueList(petHealthIssue);
    }

    @Override
    public PetHealthIssue selectPetHealthIssueByIssueId(Long issueId)
    {
        return petHealthIssueMapper.selectPetHealthIssueByIssueId(issueId);
    }

    @Override
    public List<PetHealthIssue> selectPetHealthIssueByFamily(String family)
    {
        return petHealthIssueMapper.selectPetHealthIssueByFamily(family);
    }

    @Override
    public int insertPetHealthIssue(PetHealthIssue petHealthIssue)
    {
        if (StringUtils.isBlank(petHealthIssue.getStatus()))
        {
            petHealthIssue.setStatus("0");
        }
        return petHealthIssueMapper.insertPetHealthIssue(petHealthIssue);
    }

    @Override
    public int updatePetHealthIssue(PetHealthIssue petHealthIssue)
    {
        return petHealthIssueMapper.updatePetHealthIssue(petHealthIssue);
    }

    @Override
    public int deletePetHealthIssueByIssueIds(Long[] issueIds)
    {
        return petHealthIssueMapper.deletePetHealthIssueByIssueIds(issueIds);
    }

    @Override
    public Map<String, Object> askDoctor(String question)
    {
        Map<String, Object> result = new LinkedHashMap<>();
        List<PetHealthIssue> all = petHealthIssueMapper.selectPetHealthIssueList(new PetHealthIssue());

        if (StringUtils.isBlank(question))
        {
            result.put("answer", "您好，我是宠物医生小助手（在线 AI）。请描述您家宠物的情况，例如「猫咪软便怎么办」「狗狗打喷嚏」等，我会为您解答常见问题与养护建议。");
            result.put("issues", new ArrayList<>());
            result.put("source", "online");
            result.put("model", llmModel);
            return result;
        }

        // 1) 知识库检索 + 科系加权，得到最相关的若干条目（作为在线模型的参考上下文，也用于前端展示）
        List<PetHealthIssue> matched = matchIssues(question, all);

        // 2) 调用在线模型生成回答；未启用或未指定模型名时给出明确提示（不再走离线知识库合成）
        String answer;
        String source;
        if (llmEnabled && StringUtils.isNotBlank(llmModel))
        {
            String modelAns = callOnlineLlm(question, matched);
            if (StringUtils.isNotBlank(modelAns))
            {
                answer = modelAns;
                source = "online";
            }
            else
            {
                answer = "抱歉，在线模型暂时没有返回内容，请稍后再试；若宠物出现明显不适，请尽快联系兽医或我们的在线客服。";
                source = "error";
            }
        }
        else
        {
            answer = "宠物医生在线模型尚未启用或未指定模型名。请在后端 application.yml 的 llm 配置项中确认 enabled=true 并填入模型名（默认已配置 Pollinations 免费免密钥通道）；若宠物出现明显不适，请尽快联系兽医或在线客服。";
            source = "error";
        }

        result.put("answer", answer);
        result.put("issues", matched);
        result.put("source", source);
        result.put("model", llmModel);
        return result;
    }

    /** 知识库检索：科系识别 + 二元组相似度打分，返回最相关的前 6 条 */
    private List<PetHealthIssue> matchIssues(String question, List<PetHealthIssue> all)
    {
        List<PetHealthIssue> matched = new ArrayList<>();

        String targetFamily = detectFamily(question);

        List<String> grams = buildGrams(question);

        List<Map.Entry<PetHealthIssue, Integer>> scored = new ArrayList<>();
        for (PetHealthIssue issue : all)
        {
            String text = issue.getIssueName() + " " + issue.getSymptoms() + " " + issue.getCause()
                    + " " + issue.getSolution() + " " + issue.getPrevention();
            int score = 0;
            if (issue.getIssueName() != null && issue.getIssueName().contains(question))
            {
                score += 10;
            }
            for (String g : grams)
            {
                if (text.contains(g))
                {
                    score += 2;
                }
            }
            if (targetFamily != null && targetFamily.equals(issue.getFamily()))
            {
                score += 4;
            }
            if (score > 0)
            {
                scored.add(new AbstractMap.SimpleEntry<>(issue, score));
            }
        }

        scored.sort((a, b) -> b.getValue().compareTo(a.getValue()));
        for (int i = 0; i < Math.min(scored.size(), 6); i++)
        {
            matched.add(scored.get(i).getKey());
        }
        return matched;
    }

    /** 调用在线模型（OpenAI 兼容 /chat/completions）生成回答；任何失败都返回 null（由调用方提示）。
     *  健壮性：Pollinations 等免费端点偶尔返回纯文本而非 JSON，或触发限流，这里做了重试 + 多格式兼容。 */
    private String callOnlineLlm(String question, List<PetHealthIssue> matched)
    {
        // 拼接知识库上下文（取前 4 条）作为参考，让回答更贴合平台已有的健康百科
        StringBuilder ctx = new StringBuilder();
        int n = Math.min(matched.size(), 4);
        for (int i = 0; i < n; i++)
        {
            PetHealthIssue it = matched.get(i);
            ctx.append("· ").append(it.getIssueName()).append("（").append(it.getFamily()).append("）：")
                    .append("症状：").append(nullToEmpty(it.getSymptoms())).append("；")
                    .append("诱因：").append(nullToEmpty(it.getCause())).append("；")
                    .append("解决：").append(nullToEmpty(it.getSolution())).append("；")
                    .append("预防：").append(nullToEmpty(it.getPrevention())).append("\n");
        }

        String system = "你是「宠物之家」平台的宠物健康智能助手，名叫宠医小智。请用简体中文回答用户问题，语气专业、亲切、简洁。\n"
                + "规则：\n"
                + "1）若用户问的是宠物健康/养护问题，请优先结合下方【参考知识库】给出可操作建议，不要编造具体药物剂量，必要时建议尽快就医；\n"
                + "2）若是闲聊、问候或一般性问题（如介绍自己、问好、开玩笑等），请自然、友好地回答，不要硬套宠物知识；\n"
                + "3）回答控制在 200 字以内，建议分点、条理清晰。";

        String user = "用户问题：" + question + "\n";
        if (ctx.length() > 0)
        {
            user += "【参考知识库】\n" + ctx;
        }

        Map<String, Object> sysMsg = new LinkedHashMap<>();
        sysMsg.put("role", "system");
        sysMsg.put("content", system);
        Map<String, Object> usrMsg = new LinkedHashMap<>();
        usrMsg.put("role", "user");
        usrMsg.put("content", user);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", llmModel);
        payload.put("messages", List.of(sysMsg, usrMsg));
        payload.put("temperature", 0.7);
        payload.put("stream", false);

        String body;
        try
        {
            body = JSON.writeValueAsString(payload);
        }
        catch (Exception e)
        {
            log.warn("在线模型请求体序列化失败：{}", e.getMessage());
            return null;
        }

        log.debug("LLM REQ BODY: {}", body);
        String url = llmBaseUrl.replaceAll("/+$", "") + "/chat/completions";
        HttpClient client = buildLlmClient();

        // 免费端点偶发限流/降级，重试 2 次（退避）以提升可用性
        int maxTries = 3;
        for (int attempt = 1; attempt <= maxTries; attempt++)
        {
            try
            {
                HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .header("User-Agent", "PetHome-RuoYi/1.0")
                        .timeout(Duration.ofSeconds(llmTimeout))
                        .POST(HttpRequest.BodyPublishers.ofString(body));
                // 仅当配置了 API Key 才携带鉴权头（Pollinations 等免费免密钥通道留空即可）
                if (StringUtils.isNotBlank(llmApiKey))
                {
                    reqBuilder.header("Authorization", "Bearer " + llmApiKey);
                }
                // 限流保护：保证两次请求之间至少间隔 MIN_CALL_INTERVAL_MS，避免触发 Pollinations 降级
                synchronized (PetHealthIssueServiceImpl.class)
                {
                    long now = System.currentTimeMillis();
                    long waitMs = MIN_CALL_INTERVAL_MS - (now - lastCallTs);
                    if (waitMs > 0)
                    {
                        try { Thread.sleep(waitMs); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
                    }
                    lastCallTs = System.currentTimeMillis();
                }
                HttpResponse<String> resp = client.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
                int code = resp.statusCode();
                if (code == 200)
                {
                    String ans = extractAnswer(resp.body());
                    if (StringUtils.isNotBlank(ans))
                    {
                        return ans.trim();
                    }
                    log.warn("在线模型返回 200 但未能提取回答（第 {} 次） rawBody={} headers={}", attempt, truncate(resp.body(), 300), resp.headers().map().toString());
                }
                else if (code == 429)
                {
                    log.warn("在线模型触发限流(429)，将重试（第 {} 次）", attempt);
                }
                else
                {
                    log.warn("在线模型返回非 200：{} body={}", code, truncate(resp.body(), 200));
                }
            }
            catch (Exception e)
            {
                log.warn("在线模型调用异常（第 {} 次）：{}", attempt, e.getMessage());
            }
            if (attempt < maxTries)
            {
                try { Thread.sleep(1500L * attempt); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
            }
        }
        return null;
    }

    /** 从响应体提取回答：优先按 OpenAI JSON 解析；失败则把纯文本（非 HTML/非限流提示）当作回答 */
    private String extractAnswer(String raw)
    {
        if (StringUtils.isBlank(raw)) return null;
        String trimmed = raw.trim();
        // 1) OpenAI 兼容 JSON
        try
        {
            JsonNode root = JSON.readTree(trimmed);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual() && StringUtils.isNotBlank(content.asText()) && !isDegraded(content.asText()))
            {
                return stripFence(content.asText());
            }
            JsonNode text = root.path("choices").path(0).path("text");
            if (text.isTextual() && StringUtils.isNotBlank(text.asText()) && !isDegraded(text.asText()))
            {
                return stripFence(text.asText());
            }
        }
        catch (Exception ignored)
        {
            // 不是 JSON，走纯文本分支
        }
        // 2) 纯文本兜底：排除 HTML 错误页、限流提示与降级回答
        if (trimmed.startsWith("<")) return null;
        if (isDegraded(trimmed)) return null;
        String lower = trimmed.toLowerCase();
        if (lower.contains("rate limit") || lower.contains("too many requests") || lower.contains("请求过于频繁"))
        {
            return null;
        }
        return stripFence(trimmed);
    }

    /** 识别 Pollinations 在限流/降级时返回的与宠物无关的兜底文本（这类文本应触发重试而非直接展示） */
    private boolean isDegraded(String ans)
    {
        if (StringUtils.isBlank(ans)) return true;
        String a = ans.toLowerCase();
        return a.contains("chat/completions endpoint") || a.contains("the /v1/") || a.contains("openai api");
    }

    /** 去掉可能出现的 ```json / ``` 代码块包裹 */
    private String stripFence(String s)
    {
        String t = s.trim();
        t = t.replaceAll("^```(?:json|text|markdown)?\\s*", "").replaceAll("\\s*```$", "");
        return t.trim();
    }

    private String truncate(String s, int max)
    {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    /** 构建 HttpClient：若环境配置了 HTTPS_PROXY/HTTP_PROXY 则走代理（兼容公司/校园网），否则直连。
     *  注意：必须强制 HTTP/1.1。Pollinations(Cloudflare 边缘) 对 HTTP/2 的 /chat/completions 请求会返回
     *  降级/空响应，导致「在线模型不可用」；Java 17 HttpClient 默认走 HTTP/2，这里显式改回 1.1。 */
    private HttpClient buildLlmClient()
    {
        HttpClient.Builder b = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5));
        String proxy = System.getenv("HTTPS_PROXY");
        if (StringUtils.isBlank(proxy)) proxy = System.getenv("HTTP_PROXY");
        if (StringUtils.isNotBlank(proxy))
        {
            try
            {
                String p = proxy.replaceFirst("^https?://", "");
                URI uri = URI.create(p);
                String host = uri.getHost();
                int port = uri.getPort();
                if (port == -1) port = "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
                if (StringUtils.isNotBlank(host))
                {
                    b.proxy(ProxySelector.of(new InetSocketAddress(host, port)));
                    log.info("在线模型使用代理：{}:{}", host, port);
                }
            }
            catch (Exception e)
            {
                log.warn("解析代理配置失败，改用直连：{}", e.getMessage());
            }
        }
        return b.build();
    }

    private String detectFamily(String question)
    {
        for (Map.Entry<String, String> e : FAMILY_HINT.entrySet())
        {
            if (question.contains(e.getKey()))
            {
                return e.getValue();
            }
        }
        return null;
    }

    private String nullToEmpty(String s)
    {
        return s == null ? "" : s;
    }

    /** 生成提问的二元组（长度>=2 时） */
    private List<String> buildGrams(String q)
    {
        List<String> grams = new ArrayList<>();
        String s = q.replaceAll("\\s+", "");
        if (s.length() < 2) return grams;
        for (int i = 0; i < s.length() - 1; i++)
        {
            grams.add(s.substring(i, i + 2));
        }
        return grams;
    }
}
