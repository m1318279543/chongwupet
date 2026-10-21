package com.ruoyi.system.service.impl;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.domain.PetCart;
import com.ruoyi.system.domain.PetCategory;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.mapper.PetAppointmentMapper;
import com.ruoyi.system.mapper.PetCartMapper;
import com.ruoyi.system.mapper.PetCategoryMapper;
import com.ruoyi.system.mapper.PetInfoMapper;
import com.ruoyi.system.service.IPetAiService;
import com.ruoyi.system.service.IPetDashboardService;
import com.ruoyi.system.service.IPetMatchService;

/**
 * 全站 AI 智能服务实现
 *
 * 复用 application.yml 的 llm.* 配置（OpenAI 兼容 /chat/completions，默认 Pollinations 免费免密钥通道）。
 * 设计原则：
 *   - 模型可用时走大模型，回答自然、能结合真实业务数据；
 *   - 模型不可用（超时 / 限流 / 未启用）时自动降级为本地规则结果，前端永远有内容可展示。
 *
 * @author ruoyi
 */
@Service
public class PetAiServiceImpl implements IPetAiService
{
    private static final Logger log = LoggerFactory.getLogger(PetAiServiceImpl.class);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Value("${llm.enabled:true}")
    private boolean llmEnabled;

    @Value("${llm.base-url:https://text.pollinations.ai/v1}")
    private String llmBaseUrl;

    @Value("${llm.api-key:${LLM_API_KEY:}}")
    private String llmApiKey;

    @Value("${llm.model:openai}")
    private String llmModel;

    @Value("${llm.timeout:60}")
    private int llmTimeout;

    @Autowired
    private PetInfoMapper petInfoMapper;

    @Autowired
    private PetCategoryMapper categoryMapper;

    @Autowired
    private PetAppointmentMapper appointmentMapper;

    @Autowired
    private PetCartMapper cartMapper;

    @Autowired
    private IPetDashboardService dashboardService;

    @Autowired
    private IPetMatchService matchService;

    /** 免费端点限流保护：两次模型调用最小间隔 */
    private static final long MIN_CALL_INTERVAL_MS = 1500L;
    private static long lastCallTs = 0L;

    /** 宠物库摘要缓存（60 秒），避免每次对话都全表扫描 */
    private static String catalogCache;
    private static long catalogTs = 0L;
    private static final long CATALOG_TTL_MS = 60_000L;

    /** 会话消息上限，防止上下文过长拖慢免费端点 */
    private static final int MAX_MESSAGES = 8;
    private static final int MAX_CHARS_PER_MESSAGE = 1200;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /** 问卷预算档位（与前端 match 页选项保持一致） */
    private static final String[] BUDGET_TIERS = {"1000", "3000", "6000", "99999"};
    private static final String[] MONTHLY_TIERS = {"200", "500", "1000", "99999"};

    @Override
    public boolean isAvailable()
    {
        return llmEnabled && StringUtils.isNotBlank(llmModel);
    }

    // ==================== 通用对话 ====================

    @Override
    public Map<String, Object> chat(List<Map<String, String>> messages, String scene, Long petId)
    {
        List<Map<String, String>> safe = sanitize(messages);
        String lastUser = lastUserText(safe);

        Map<String, Object> result = new LinkedHashMap<>();
        if (safe.isEmpty())
        {
            result.put("reply", "你好，我是宠物之家的 AI 助手小爪 🐾 可以帮你选宠物、看订单预约、解答养护问题，想了解点什么？");
            result.put("source", "rule");
            result.put("model", llmModel);
            return result;
        }

        if (isAvailable())
        {
            List<Map<String, String>> payload = new ArrayList<>();
            Map<String, String> sys = new LinkedHashMap<>();
            sys.put("role", "system");
            sys.put("content", buildSystemPrompt(scene, petId));
            payload.add(sys);
            payload.addAll(safe);

            String reply = callModel(payload, 0.7);
            if (StringUtils.isNotBlank(reply))
            {
                result.put("reply", cleanMarkdown(reply.trim()));
                result.put("source", "ai");
                result.put("model", llmModel);
                return result;
            }
        }

        // 降级：本地规则回复，保证功能不空白
        result.put("reply", localReply(lastUser, scene));
        result.put("source", "rule");
        result.put("model", llmModel);
        return result;
    }

    // ==================== 流式对话（SSE） ====================

    @Override
    public String chatStream(List<Map<String, String>> messages, String scene, Long petId,
                             java.util.function.Consumer<String> onDelta)
    {
        List<Map<String, String>> safe = sanitize(messages);
        String lastUser = lastUserText(safe);
        if (safe.isEmpty())
        {
            onDelta.accept("你好，我是宠物之家的 AI 助手小爪 🐾 可以帮你选宠物、看订单预约、解答养护问题，想了解点什么？");
            return "rule";
        }

        boolean anySent = false;
        if (isAvailable())
        {
            List<Map<String, String>> payload = new ArrayList<>();
            Map<String, String> sys = new LinkedHashMap<>();
            sys.put("role", "system");
            sys.put("content", buildSystemPrompt(scene, petId));
            payload.add(sys);
            payload.addAll(safe);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", llmModel);
            body.put("messages", payload);
            body.put("temperature", 0.7);
            body.put("stream", true);

            String json;
            try
            {
                json = JSON.writeValueAsString(body);
            }
            catch (Exception e)
            {
                json = null;
            }

            if (json != null)
            {
                String url = llmBaseUrl.replaceAll("/+$", "") + "/chat/completions";
                HttpClient client = buildClient();
                int timeout = Math.max(20, Math.min(llmTimeout, 90));
                for (int attempt = 1; attempt <= 2; attempt++)
                {
                    int retryAfter = 0;
                    try
                    {
                        waitTurn();
                        HttpRequest.Builder rb = HttpRequest.newBuilder()
                                .uri(URI.create(url))
                                .header("Content-Type", "application/json")
                                .header("Accept", "text/event-stream")
                                .header("User-Agent", "PetHome-RuoYi/1.0")
                                .timeout(Duration.ofSeconds(timeout))
                                .POST(HttpRequest.BodyPublishers.ofString(json));
                        if (StringUtils.isNotBlank(llmApiKey))
                        {
                            rb.header("Authorization", "Bearer " + llmApiKey);
                        }
                        HttpResponse<InputStream> resp = client.send(rb.build(), HttpResponse.BodyHandlers.ofInputStream());
                        int code = resp.statusCode();
                        if (code == 200)
                        {
                            StringBuilder full = new StringBuilder();
                            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resp.body(), StandardCharsets.UTF_8)))
                            {
                                String line;
                                while ((line = reader.readLine()) != null)
                                {
                                    if (!line.startsWith("data:"))
                                    {
                                        continue;
                                    }
                                    String data = line.substring(5).trim();
                                    if (data.isEmpty() || "[DONE]".equals(data))
                                    {
                                        continue;
                                    }
                                    try
                                    {
                                        JsonNode node = JSON.readTree(data);
                                        JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                                        if (delta.isTextual() && delta.asText().length() > 0)
                                        {
                                            String piece = delta.asText();
                                            full.append(piece);
                                            anySent = true;
                                            onDelta.accept(piece);
                                        }
                                    }
                                    catch (Exception ignored)
                                    {
                                    }
                                }
                            }
                            if (full.length() > 0)
                            {
                                return "ai";
                            }
                            log.warn("AI 流式返回 200 但无内容（第 {} 次）", attempt);
                        }
                        else if (code == 402 || code == 429)
                        {
                            retryAfter = retryAfterSeconds("", resp.headers().firstValue("retry-after").orElse(null));
                            log.warn("AI 流式触发限流({})，建议等待 {}s（第 {} 次）", code, retryAfter, attempt);
                        }
                        else
                        {
                            log.warn("AI 流式返回非 200：{}", code);
                        }
                    }
                    catch (Exception e)
                    {
                        log.warn("AI 流式调用异常（第 {} 次）：{}", attempt, e.getMessage());
                    }
                    if (anySent)
                    {
                        // 已经推了部分内容，不再重试，避免前端出现重复文本
                        return "ai";
                    }
                    if (attempt < 2)
                    {
                        if (retryAfter > 12)
                        {
                            break;
                        }
                        long wait = retryAfter > 0 ? retryAfter * 1000L + 300L : 1200L;
                        try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
                    }
                }
            }
        }

        // 降级：本地规则一次性推送
        String fallback = localReply(lastUser, scene);
        onDelta.accept(fallback);
        return "rule";
    }

    /** 组装系统提示词：平台能力 + 在售宠物 + 当前用户业务数据 + 场景补充 */
    private String buildSystemPrompt(String scene, Long petId)
    {
        StringBuilder sb = new StringBuilder();
        sb.append("你是「宠物之家」商城的 AI 助手，名叫小爪，性格亲切、专业、简洁。\n");
        sb.append("平台提供：宠物选购、AI 智能选宠（问卷匹配）、预约看宠、宠物粮商城、在线宠物医生、售后四项保障（健康筛查 / 真实信息 / 专业养护 / 售后无忧）。\n");
        sb.append("回答规则：\n");
        sb.append("1. 使用简体中文，口语化，控制在 150 字以内；需要罗列时用「· 」开头的短列表；禁止使用 Markdown 语法（不要 ** 加粗、# 标题、表格、代码块）。\n");
        sb.append("2. 推荐宠物只能从下方【在售宠物】中挑选，给出名称、品种和价格，不要编造不存在的宠物或价格。\n");
        sb.append("3. 用户问订单、预约、购物车时，严格依据【我的业务数据】回答；查不到就说明未查询到，并引导他去「我的订单」或「我的预约」页面。\n");
        sb.append("4. 涉及疾病、用药的问题只给一般性护理建议，提醒不要自行用药；情况严重时建议尽快就医或转「宠物医生」。\n");
        sb.append("5. 与宠物或本平台无关的问题，礼貌说明你只负责宠物相关咨询。\n");
        sb.append("6. 用户想系统化选宠时，引导他打开「AI 选宠」页，用一句话描述需求即可自动匹配。\n\n");

        sb.append("【在售宠物（部分）】\n").append(petCatalog()).append("\n");

        String biz = userBusinessContext();
        if (StringUtils.isNotBlank(biz))
        {
            sb.append("\n【我的业务数据】\n").append(biz).append("\n");
        }

        if ("detail".equals(scene) && petId != null)
        {
            String detail = petDetailContext(petId);
            if (StringUtils.isNotBlank(detail))
            {
                sb.append("\n【用户正在浏览的宠物】\n").append(detail).append("\n");
                sb.append("用户此刻正在看这只宠物，优先围绕它回答（是否适合他、怎么养、价格构成、如何预约看宠）。\n");
            }
        }
        return sb.toString();
    }

    /** 在售宠物摘要（缓存 60 秒）：按品类均衡取样，保证猫狗等主力品类都出现在上下文里 */
    private String petCatalog()
    {
        long now = System.currentTimeMillis();
        if (catalogCache != null && now - catalogTs < CATALOG_TTL_MS)
        {
            return catalogCache;
        }
        StringBuilder sb = new StringBuilder();
        try
        {
            Map<Long, String> catNames = new LinkedHashMap<>();
            try
            {
                List<PetCategory> cats = categoryMapper.selectPetCategoryList(new PetCategory());
                if (cats != null)
                {
                    for (PetCategory c : cats)
                    {
                        catNames.put(c.getCategoryId(), c.getCategoryName());
                    }
                }
            }
            catch (Exception ignore)
            {
                // 分类读不到不影响主流程
            }

            List<PetInfo> pets = petInfoMapper.selectPetInfoList(new PetInfo());
            // 按品类分组，每类最多取 6 只，避免摘要被单一品类占满
            Map<Long, List<PetInfo>> grouped = new LinkedHashMap<>();
            for (PetInfo p : pets)
            {
                Long cid = p.getCategoryId() == null ? 0L : p.getCategoryId();
                grouped.computeIfAbsent(cid, k -> new ArrayList<>()).add(p);
            }
            int shown = 0;
            for (Map.Entry<Long, List<PetInfo>> e : grouped.entrySet())
            {
                String cat = catNames.getOrDefault(e.getKey(), "其他");
                List<PetInfo> list = e.getValue();
                int n = Math.min(6, list.size());
                for (int i = 0; i < n; i++)
                {
                    PetInfo p = list.get(i);
                    sb.append("- [").append(cat).append("] ").append(p.getPetName());
                    if (StringUtils.isNotBlank(p.getBreed()))
                    {
                        sb.append("（").append(p.getBreed()).append("）");
                    }
                    sb.append("，").append(p.getAge() == null ? "年龄未知" : p.getAge());
                    if (p.getPrice() != null)
                    {
                        sb.append("，¥").append(p.getPrice().stripTrailingZeros().toPlainString());
                    }
                    if (StringUtils.isNotBlank(p.getDescription()))
                    {
                        sb.append("，").append(shorten(p.getDescription(), 24));
                    }
                    sb.append("\n");
                    shown++;
                }
                sb.append("（").append(cat).append("共 ").append(list.size()).append(" 只在售）\n");
            }
            sb.append("合计 ").append(pets.size()).append(" 只在售，以上为各品类代表。\n");
            log.debug("宠物库摘要 {} 条", shown);
            catalogCache = sb.toString();
            catalogTs = now;
        }
        catch (Exception e)
        {
            log.warn("读取在售宠物失败：{}", e.getMessage());
            return "（宠物库暂时读取失败）";
        }
        return catalogCache;
    }

    private String petDetailContext(Long petId)
    {
        try
        {
            PetInfo q = new PetInfo();
            List<PetInfo> all = petInfoMapper.selectPetInfoList(q);
            for (PetInfo p : all)
            {
                if (petId.equals(p.getPetId()))
                {
                    StringBuilder sb = new StringBuilder();
                    sb.append("名称：").append(p.getPetName()).append("\n");
                    sb.append("品种：").append(nvl(p.getBreed())).append("\n");
                    sb.append("年龄：").append(nvl(p.getAge())).append("，性别：").append(nvl(p.getGender())).append("\n");
                    sb.append("价格：¥").append(p.getPrice() == null ? "面议" : p.getPrice().stripTrailingZeros().toPlainString()).append("\n");
                    sb.append("介绍：").append(shorten(nvl(p.getDescription()), 200)).append("\n");
                    return sb.toString();
                }
            }
        }
        catch (Exception e)
        {
            log.warn("读取宠物详情失败：{}", e.getMessage());
        }
        return "";
    }

    /** 当前登录用户的预约 / 购物车摘要（游客返回空） */
    private String userBusinessContext()
    {
        Long userId;
        String userName;
        try
        {
            userId = SecurityUtils.getUserId();
            userName = SecurityUtils.getUsername();
        }
        catch (Exception e)
        {
            return "";
        }
        if (userId == null)
        {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("当前登录用户：").append(nvl(userName)).append("\n");
        try
        {
            PetAppointment aq = new PetAppointment();
            aq.setUserId(userId);
            List<PetAppointment> appts = appointmentMapper.selectPetAppointmentList(aq);
            if (appts != null && !appts.isEmpty())
            {
                sb.append("最近预约：\n");
                int n = Math.min(appts.size(), 5);
                for (int i = 0; i < n; i++)
                {
                    PetAppointment a = appts.get(i);
                    sb.append("· ").append(nvl(a.getPetName()))
                      .append("，").append(a.getAppointmentDate() == null ? "时间待定" : new java.text.SimpleDateFormat("yyyy-MM-dd").format(a.getAppointmentDate()))
                      .append("，状态：").append(apptStatus(a.getStatus())).append("\n");
                }
            }
            else
            {
                sb.append("最近预约：无\n");
            }

            PetCart cq = new PetCart();
            cq.setUserId(userId);
            List<PetCart> carts = cartMapper.selectPetCartList(cq);
            if (carts != null && !carts.isEmpty())
            {
                sb.append("购物车/订单：\n");
                int n = Math.min(carts.size(), 5);
                for (int i = 0; i < n; i++)
                {
                    PetCart c = carts.get(i);
                    sb.append("· ").append(nvl(c.getGoodsName()))
                      .append(" × ").append(c.getQty() == null ? 1 : c.getQty())
                      .append("，¥").append(c.getAmount() == null ? "—" : c.getAmount())
                      .append("，状态：").append("3".equals(c.getStatus()) ? "已取消" : "正常/已下单").append("\n");
                }
            }
            else
            {
                sb.append("购物车/订单：无\n");
            }
        }
        catch (Exception e)
        {
            log.warn("读取用户业务数据失败：{}", e.getMessage());
        }
        return sb.toString();
    }

    private static String apptStatus(String s)
    {
        if ("0".equals(s)) return "待处理";
        if ("1".equals(s)) return "已确认";
        if ("2".equals(s)) return "已完成";
        if ("3".equals(s)) return "已取消";
        return nvl(s);
    }

    // ==================== 自然语言选宠解析 ====================

    @Override
    public Map<String, Object> parseMatchDemand(String text)
    {
        Map<String, Object> result = new LinkedHashMap<>();
        String input = text == null ? "" : text.trim();
        if (input.isEmpty())
        {
            result.put("answers", new LinkedHashMap<String, String>());
            result.put("summary", "请先描述一下你的居住环境、作息和预算");
            result.put("source", "empty");
            return result;
        }

        // 1) 本地规则先给出保底结果（模型不可用 / 解析失败时使用）
        Map<String, String> local = localParse(input);

        Map<String, String> answers = local;
        String summary = localSummary(local);
        String source = "rule";

        // 2) 模型解析：更懂口语表达，覆盖本地结果
        if (isAvailable())
        {
            List<Map<String, String>> msgs = new ArrayList<>();
            Map<String, String> sys = new LinkedHashMap<>();
            sys.put("role", "system");
            sys.put("content", parseSystemPrompt());
            msgs.add(sys);
            Map<String, String> usr = new LinkedHashMap<>();
            usr.put("role", "user");
            usr.put("content", input);
            msgs.add(usr);

            String out = callModel(msgs, 0.2);
            if (StringUtils.isNotBlank(out))
            {
                Map<String, String> parsed = extractAnswers(out);
                if (parsed != null)
                {
                    // 模型给出的每个合法字段覆盖本地值
                    for (Map.Entry<String, String> e : parsed.entrySet())
                    {
                        if (e.getValue() != null && !e.getValue().isEmpty())
                        {
                            answers.put(e.getKey(), e.getValue());
                        }
                    }
                    String s = parsed.get("summary");
                    if (StringUtils.isNotBlank(s))
                    {
                        summary = s;
                    }
                    source = "ai";
                }
            }
        }

        Map<String, String> clean = normalizeAnswers(answers);
        result.put("answers", clean);
        result.put("summary", summary);
        result.put("source", source);
        result.put("model", llmModel);
        result.put("filled", countFilled(clean));
        result.put("total", 10);
        result.put("keywords", local.get("_keywords"));
        return result;
    }

    private String parseSystemPrompt()
    {
        return "你是需求解析器。把用户关于养宠的中文描述解析成 JSON，只输出 JSON 本体，不要任何解释或代码块标记。\n"
                + "字段与取值：\n"
                + "home: small(小户型/合租/单间)|apartment(普通住宅)|house(大房子/带院子)\n"
                + "kids: yes|no（家里有 12 岁以下小孩）\n"
                + "noise: low|mid|high（对宠物叫声的容忍度，提到怕吵/邻居就是 low）\n"
                + "activity: low|mid|high（运动倾向，宅/不运动=low，健身/跑步/high）\n"
                + "time: lt1|mid|gt3（每天能陪伴的时间，上班忙/加班/出差多=lt1）\n"
                + "companion: clingy|independent|any（想要粘人陪伴=clingy，想要省心独立=independent）\n"
                + "experience: none|some|pro（第一次养=none，养过=some，多年经验=pro）\n"
                + "budget: 数字（购宠预算上限，单位元；未提及填 3000）\n"
                + "monthly: 数字（每月养护预算，单位元；未提及填 500）\n"
                + "prefer: any|1|2|3|4|5|6|7（1猫 2狗 3兔 4仓鼠 5鸟 6水族 7爬行，未提就 any）\n"
                + "summary: 一句话概括用户画像，20 字以内，例如「小户型上班族，想养安静好照顾的猫」\n"
                + "注意：用户没提到的字段按上面默认值填，不要留空，不要新增字段。";
    }

    /** 从模型输出中提取 answers（宽容处理代码块、前后杂文字） */
    @SuppressWarnings("unchecked")
    private Map<String, String> extractAnswers(String raw)
    {
        try
        {
            String json = stripToJson(raw);
            if (json == null)
            {
                return null;
            }
            JsonNode root = JSON.readTree(json);
            JsonNode node = root.has("answers") ? root.get("answers") : root;
            if (node == null || !node.isObject())
            {
                return null;
            }
            Map<String, String> map = new LinkedHashMap<>();
            node.fields().forEachRemaining(e -> {
                JsonNode v = e.getValue();
                map.put(e.getKey(), v == null || v.isNull() ? "" : v.asText());
            });
            return map;
        }
        catch (Exception e)
        {
            log.warn("解析模型选宠结果失败：{}，原文：{}", e.getMessage(), shorten(raw, 200));
            return null;
        }
    }

    private static String stripToJson(String raw)
    {
        if (raw == null)
        {
            return null;
        }
        String t = raw.trim().replaceAll("^```(?:json)?\\s*", "").replaceAll("\\s*```$", "");
        int s = t.indexOf('{');
        int e = t.lastIndexOf('}');
        if (s < 0 || e <= s)
        {
            return null;
        }
        return t.substring(s, e + 1);
    }

    /** 本地关键词解析（无模型时的保底，也用于判断输入是否信息量太少） */
    private Map<String, String> localParse(String t)
    {
        Map<String, String> a = new LinkedHashMap<>();
        List<String> hit = new ArrayList<>();

        // 居住
        if (has(t, "小户型", "合租", "单间", "一居", "租房", "宿舍", "小房子"))
        {
            a.put("home", "small"); hit.add("小户型");
        }
        else if (has(t, "别墅", "院子", "大房子", "复式", "农村", "自建"))
        {
            a.put("home", "house"); hit.add("大空间");
        }
        else if (has(t, "两居", "三居", "普通住宅", "公寓", "家里", "房子"))
        {
            a.put("home", "apartment");
        }

        // 小孩（先判断否定表达，避免「家里没有小孩」被误识别成有小孩）
        if (has(t, "没有小孩", "没小孩", "没有孩子", "没孩子", "无孩", "单身", "两口", "独居", "情侣"))
        {
            a.put("kids", "no");
        }
        else if (has(t, "小孩", "孩子", "宝宝", "儿子", "女儿", "儿童", "娃"))
        {
            a.put("kids", "yes"); hit.add("有小孩");
        }

        // 噪音
        if (has(t, "怕吵", "安静", "隔音", "邻居", "不吵", "叫得少", "别叫"))
        {
            a.put("noise", "low"); hit.add("要安静");
        }
        else if (has(t, "不怕吵", "无所谓", "叫也没事", "独栋"))
        {
            a.put("noise", "high");
        }

        // 运动
        if (has(t, "宅", "不爱动", "懒得", "不运动", "久坐", "不爱出门", "躺平"))
        {
            a.put("activity", "low"); hit.add("不爱运动");
        }
        else if (has(t, "健身", "跑步", "爱运动", "户外", "爬山", "骑行", "每天遛"))
        {
            a.put("activity", "high"); hit.add("爱运动");
        }

        // 时间
        if (has(t, "上班", "加班", "996", "忙", "出差", "没时间", "早九晚", "工作忙", "白天不在"))
        {
            a.put("time", "lt1"); hit.add("平时很忙");
        }
        else if (has(t, "在家", "居家", "自由职业", "全职", "时间多", "退休", "全天"))
        {
            a.put("time", "gt3"); hit.add("时间充裕");
        }

        // 陪伴
        if (has(t, "粘人", "陪伴", "亲近", "黏人", "陪着我", "亲密", "互动多"))
        {
            a.put("companion", "clingy"); hit.add("想要粘人");
        }
        else if (has(t, "独立", "省心", "不粘", "自己待", "好养"))
        {
            a.put("companion", "independent");
        }

        // 经验
        if (has(t, "新手", "第一次", "没养过", "小白", "初次", "不懂"))
        {
            a.put("experience", "none"); hit.add("新手");
        }
        else if (has(t, "养过", "有经验", "多年", "老手", "养了"))
        {
            a.put("experience", "pro");
        }

        // 预算
        Integer budget = findMoney(t, "预算", "购宠", "买宠物");
        if (budget != null)
        {
            a.put("budget", String.valueOf(budget)); hit.add("预算" + budget);
        }
        Integer monthly = findMoney(t, "每月", "月均", "每个月", "养护费", "月花");
        if (monthly != null)
        {
            a.put("monthly", String.valueOf(monthly)); hit.add("月养" + monthly);
        }

        // 类型
        if (has(t, "猫")) { a.put("prefer", "1"); hit.add("猫"); }
        else if (has(t, "狗", "犬", "汪")) { a.put("prefer", "2"); hit.add("狗"); }
        else if (has(t, "兔")) { a.put("prefer", "3"); hit.add("兔"); }
        else if (has(t, "仓鼠", "鼠")) { a.put("prefer", "4"); hit.add("仓鼠"); }
        else if (has(t, "鸟", "鹦鹉", "玄凤")) { a.put("prefer", "5"); hit.add("鸟"); }
        else if (has(t, "鱼", "水族", "观赏鱼", "缸")) { a.put("prefer", "6"); hit.add("水族"); }
        else if (has(t, "龟", "蜥", "蛇", "爬宠", "爬行")) { a.put("prefer", "7"); hit.add("爬宠"); }

        a.put("_keywords", String.join("、", hit));
        return a;
    }

    private static boolean has(String text, String... keys)
    {
        for (String k : keys)
        {
            if (text.contains(k))
            {
                return true;
            }
        }
        return false;
    }

    /** 从「预算 3000」「3000 元以内」「每月 500」中抽取金额 */
    private static Integer findMoney(String text, String... anchors)
    {
        for (String anchor : anchors)
        {
            int i = text.indexOf(anchor);
            if (i < 0)
            {
                continue;
            }
            String tail = text.substring(Math.max(0, i - 6), Math.min(text.length(), i + anchor.length() + 10));
            Matcher m = Pattern.compile("(\\d{2,6})(?:\\.0)?").matcher(tail);
            if (m.find())
            {
                try
                {
                    int v = Integer.parseInt(m.group(1));
                    if (v >= 50 && v <= 500000)
                    {
                        return v;
                    }
                }
                catch (Exception ignored)
                {
                }
            }
        }
        return null;
    }

    /** 保证 10 个字段齐全（问卷必须全部有值才能提交） */
    private Map<String, String> normalizeAnswers(Map<String, String> in)
    {
        Map<String, String> a = new LinkedHashMap<>();
        a.put("home", pick(in.get("home"), "small", "apartment", "house", "apartment"));
        a.put("kids", pick(in.get("kids"), "yes", "no", "no"));
        a.put("noise", pick(in.get("noise"), "low", "mid", "high", "mid"));
        a.put("activity", pick(in.get("activity"), "low", "mid", "high", "mid"));
        a.put("time", pick(in.get("time"), "lt1", "mid", "gt3", "mid"));
        a.put("companion", pick(in.get("companion"), "clingy", "independent", "any", "any"));
        a.put("experience", pick(in.get("experience"), "none", "some", "pro", "some"));
        a.put("budget", moneyPick(in.get("budget"), BUDGET_TIERS, "3000"));
        a.put("monthly", moneyPick(in.get("monthly"), MONTHLY_TIERS, "500"));
        String prefer = in.get("prefer");
        if (prefer != null && prefer.matches("[1-7]"))
        {
            a.put("prefer", prefer);
        }
        else
        {
            a.put("prefer", "any");
        }
        return a;
    }

    private static String pick(String v, String o1, String o2, String def)
    {
        if (o1.equals(v) || o2.equals(v))
        {
            return v;
        }
        return def;
    }

    private static String pick(String v, String o1, String o2, String o3, String def)
    {
        if (o1.equals(v) || o2.equals(v) || o3.equals(v))
        {
            return v;
        }
        return def;
    }

    /** 金额转成问卷档位（与 match 页选项一致） */
    private static String moneyPick(String v, String[] tiers, String def)
    {
        String n = v == null ? "" : v.replaceAll("[^0-9]", "");
        if (n.isEmpty())
        {
            return def;
        }
        int x;
        try
        {
            x = Integer.parseInt(n);
        }
        catch (Exception e)
        {
            return def;
        }
        for (String t : tiers)
        {
            if (x <= Integer.parseInt(t))
            {
                return t;
            }
        }
        return tiers[tiers.length - 1];
    }

    private static int countFilled(Map<String, String> a)
    {
        int n = 0;
        for (String v : a.values())
        {
            if (StringUtils.isNotBlank(v))
            {
                n++;
            }
        }
        return n;
    }

    private static String localSummary(Map<String, String> a)
    {
        List<String> parts = new ArrayList<>();
        String home = a.get("home");
        if ("small".equals(home)) parts.add("小户型");
        else if ("house".equals(home)) parts.add("空间充裕");
        if ("lt1".equals(a.get("time"))) parts.add("平时较忙");
        if ("none".equals(a.get("experience"))) parts.add("新手");
        if ("yes".equals(a.get("kids"))) parts.add("有小孩");
        if (a.containsKey("prefer"))
        {
            String p = a.get("prefer");
            if ("1".equals(p)) parts.add("想养猫");
            else if ("2".equals(p)) parts.add("想养狗");
            else if ("3".equals(p)) parts.add("想养兔");
            else if ("4".equals(p)) parts.add("想养仓鼠");
            else if ("5".equals(p)) parts.add("想养鸟");
            else if ("6".equals(p)) parts.add("想养观赏鱼");
            else if ("7".equals(p)) parts.add("想养爬宠");
        }
        if (parts.isEmpty())
        {
            return "已按你的描述生成养宠画像";
        }
        return String.join("，", parts);
    }

    // ==================== 经营洞察 ====================

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> businessInsight(int days)
    {
        int span = Math.max(1, Math.min(days, 180));
        Map<String, Object> data = dashboardService.all(span);
        Map<String, Object> overview = (Map<String, Object>) data.getOrDefault("overview", new LinkedHashMap<>());
        Map<String, Object> growth = (Map<String, Object>) overview.getOrDefault("growth", new LinkedHashMap<>());
        Map<String, Object> today = (Map<String, Object>) data.getOrDefault("today", new LinkedHashMap<>());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("days", span);
        result.put("overview", overview);
        result.put("generatedAt", LocalDate.now().format(DATE_FMT));
        result.put("model", llmModel);

        if (isAvailable())
        {
            List<Map<String, String>> msgs = new ArrayList<>();
            Map<String, String> sys = new LinkedHashMap<>();
            sys.put("role", "system");
            sys.put("content", insightSystemPrompt());
            msgs.add(sys);
            Map<String, String> usr = new LinkedHashMap<>();
            usr.put("role", "user");
            usr.put("content", insightFacts(data, span));
            msgs.add(usr);

            String out = callModel(msgs, 0.4);
            if (StringUtils.isNotBlank(out))
            {
                result.put("insight", cleanMarkdown(out.trim()));
                result.put("source", "ai");
                return result;
            }
        }

        result.put("insight", localInsight(overview, growth, today, span));
        result.put("source", "rule");
        return result;
    }

    private String insightSystemPrompt()
    {
        return "你是宠物电商的资深运营分析师。根据给定的经营数据，写一段中文分析，要求：\n"
                + "1. 先用一句话总结整体表现（好/一般/需要关注），点出核心数字；\n"
                + "2. 用「· 」列 3 条关键发现，每条包含数据依据（对比上期或占比）；\n"
                + "3. 最后给 2 条具体可执行的建议（针对预约转化、订单、内容运营等）；\n"
                + "4. 总字数 220 字以内，不要 Markdown 标题、不要编造没有的数据。";
    }

    @SuppressWarnings("unchecked")
    private String insightFacts(Map<String, Object> data, int span)
    {
        StringBuilder sb = new StringBuilder();
        sb.append("统计周期：最近 ").append(span).append(" 天\n");
        Map<String, Object> ov = (Map<String, Object>) data.getOrDefault("overview", new LinkedHashMap<>());
        appendNum(sb, ov, "appointments", "预约量");
        appendNum(sb, ov, "orders", "订单量");
        appendNum(sb, ov, "revenue", "成交金额");
        appendNum(sb, ov, "consults", "咨询量");
        appendNum(sb, ov, "doctorConsults", "问诊量");
        appendNum(sb, ov, "favorites", "收藏量");
        appendNum(sb, ov, "activeUsers", "活跃用户");
        appendNum(sb, ov, "pendingAppointments", "待处理预约");
        appendNum(sb, ov, "pendingOrders", "待处理订单");
        appendNum(sb, ov, "avgOrderAmount", "客单价");
        sb.append("取消率：").append(ov.getOrDefault("cancelRate", "—")).append("%\n");

        Object g = ov.get("growth");
        if (g instanceof Map)
        {
            Map<String, Object> growth = (Map<String, Object>) g;
            sb.append("环比上期：");
            sb.append("预约 ").append(pct(growth.get("appointments"))).append("，");
            sb.append("订单 ").append(pct(growth.get("orders"))).append("，");
            sb.append("成交额 ").append(pct(growth.get("revenue"))).append("，");
            sb.append("咨询 ").append(pct(growth.get("consults"))).append("\n");
        }

        Object dist = data.get("distribution");
        if (dist instanceof Map)
        {
            Object byCat = ((Map<String, Object>) dist).get("category");
            if (byCat instanceof List && !((List<?>) byCat).isEmpty())
            {
                sb.append("品类分布：");
                int n = 0;
                for (Object o : (List<?>) byCat)
                {
                    if (n++ >= 5) break;
                    Map<String, Object> m = (Map<String, Object>) o;
                    sb.append(m.get("name")).append(" ").append(m.get("value")).append("；");
                }
                sb.append("\n");
            }
        }

        Object ranking = data.get("ranking");
        if (ranking instanceof Map)
        {
            Object pets = ((Map<String, Object>) ranking).get("pets");
            if (pets instanceof List && !((List<?>) pets).isEmpty())
            {
                sb.append("热门宠物：");
                int n = 0;
                for (Object o : (List<?>) pets)
                {
                    if (n++ >= 5) break;
                    Map<String, Object> m = (Map<String, Object>) o;
                    sb.append(m.get("name")).append("(").append(m.get("value")).append(")；");
                }
                sb.append("\n");
            }
        }
        return sb.toString();
    }

    private static void appendNum(StringBuilder sb, Map<String, Object> m, String key, String label)
    {
        Object v = m.get(key);
        if (v != null)
        {
            sb.append(label).append("：").append(v).append("\n");
        }
    }

    private static String pct(Object v)
    {
        if (v == null)
        {
            return "持平";
        }
        try
        {
            double d = Double.parseDouble(v.toString());
            return (d > 0 ? "+" : "") + Math.round(d * 10) / 10.0 + "%";
        }
        catch (Exception e)
        {
            return "持平";
        }
    }

    /** 本地规则洞察（模型不可用时） */
    private String localInsight(Map<String, Object> ov, Map<String, Object> growth, Map<String, Object> today, int span)
    {
        StringBuilder sb = new StringBuilder();
        long appointments = lng(ov.get("appointments"));
        long orders = lng(ov.get("orders"));
        double revenue = dbl(ov.get("revenue"));
        long pendingA = lng(ov.get("pendingAppointments"));
        long pendingO = lng(ov.get("pendingOrders"));

        sb.append("最近 ").append(span).append(" 天共产生 ").append(appointments).append(" 次预约、")
          .append(orders).append(" 笔订单，成交 ¥").append(fmtMoney(revenue)).append("。\n");
        sb.append("· 预约环比 ").append(pct(growth.get("appointments")))
          .append("，订单环比 ").append(pct(growth.get("orders")))
          .append("，成交额环比 ").append(pct(growth.get("revenue"))).append("\n");
        sb.append("· 待处理预约 ").append(pendingA).append(" 条、待处理订单 ").append(pendingO)
          .append(" 笔，处理时效直接影响转化\n");
        sb.append("· 平均客单价 ¥").append(fmtMoney(dbl(ov.get("avgOrderAmount"))))
          .append("，取消率 ").append(ov.getOrDefault("cancelRate", 0)).append("%\n");
        sb.append("建议：优先清理待处理预约与订单，避免流失；对高意向收藏用户做一次预约提醒触达。");
        return sb.toString();
    }

    private static long lng(Object v)
    {
        try { return v == null ? 0L : Math.round(Double.parseDouble(v.toString())); } catch (Exception e) { return 0L; }
    }

    private static double dbl(Object v)
    {
        try { return v == null ? 0D : Double.parseDouble(v.toString()); } catch (Exception e) { return 0D; }
    }

    private static String fmtMoney(double v)
    {
        return String.format("%,.0f", v);
    }

    // ==================== 模型调用 ====================

    @Override
    public String rawChat(List<Map<String, String>> messages, double temperature)
    {
        return callModel(sanitize(messages), temperature);
    }

    private String callModel(List<Map<String, String>> messages, double temperature)
    {
        if (!isAvailable() || messages == null || messages.isEmpty())
        {
            return null;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", llmModel);
        payload.put("messages", messages);
        payload.put("temperature", temperature);
        payload.put("stream", false);

        String body;
        try
        {
            body = JSON.writeValueAsString(payload);
        }
        catch (Exception e)
        {
            log.warn("AI 请求体序列化失败：{}", e.getMessage());
            return null;
        }

        String url = llmBaseUrl.replaceAll("/+$", "") + "/chat/completions";
        HttpClient client = buildClient();
        int timeout = Math.max(10, Math.min(llmTimeout, 60));

        for (int attempt = 1; attempt <= 2; attempt++)
        {
            int retryAfter = 0;
            try
            {
                waitTurn();
                HttpRequest.Builder rb = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .header("Accept", "application/json")
                        .header("User-Agent", "PetHome-RuoYi/1.0")
                        .timeout(Duration.ofSeconds(timeout))
                        .POST(HttpRequest.BodyPublishers.ofString(body));
                if (StringUtils.isNotBlank(llmApiKey))
                {
                    rb.header("Authorization", "Bearer " + llmApiKey);
                }
                HttpResponse<String> resp = client.send(rb.build(), HttpResponse.BodyHandlers.ofString());
                int code = resp.statusCode();
                if (code == 200)
                {
                    String ans = extractAnswer(resp.body());
                    if (StringUtils.isNotBlank(ans))
                    {
                        return ans;
                    }
                    log.warn("AI 返回 200 但无有效内容（第 {} 次）：{}", attempt, shorten(resp.body(), 200));
                }
                else if (code == 402 || code == 429)
                {
                    retryAfter = retryAfterSeconds(resp.body(), resp.headers().firstValue("retry-after").orElse(null));
                    log.warn("AI 触发免费额度限流({})，建议等待 {}s（第 {} 次）", code, retryAfter, attempt);
                }
                else
                {
                    log.warn("AI 返回非 200：{} body={}", code, shorten(resp.body(), 200));
                }
            }
            catch (Exception e)
            {
                log.warn("AI 调用异常（第 {} 次）：{}", attempt, e.getMessage());
            }
            if (attempt < 2)
            {
                // 限流等待时间过长时直接放弃，由调用方降级，避免用户干等
                if (retryAfter > 12)
                {
                    break;
                }
                long wait = retryAfter > 0 ? retryAfter * 1000L + 300L : 1200L;
                try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
            }
        }
        return null;
    }

    /** 从响应体或 Retry-After 头解析需要等待的秒数（无法判断时返回 0） */
    private static int retryAfterSeconds(String body, String header)
    {
        if (StringUtils.isNotBlank(header))
        {
            try
            {
                return (int) Math.ceil(Double.parseDouble(header.trim()));
            }
            catch (Exception ignored)
            {
            }
        }
        if (StringUtils.isNotBlank(body))
        {
            Matcher m = Pattern.compile("retry after\\s*(\\d+)\\s*s", Pattern.CASE_INSENSITIVE).matcher(body);
            if (m.find())
            {
                try { return Integer.parseInt(m.group(1)); } catch (Exception ignored) { }
            }
        }
        return 0;
    }

    /** 免费端点限流保护：保证两次调用之间至少间隔 MIN_CALL_INTERVAL_MS */
    private static synchronized void waitTurn()
    {
        long now = System.currentTimeMillis();
        long wait = MIN_CALL_INTERVAL_MS - (now - lastCallTs);
        if (wait > 0)
        {
            try { Thread.sleep(wait); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
        }
        lastCallTs = System.currentTimeMillis();
    }

    private HttpClient buildClient()
    {
        HttpClient.Builder b = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(6));
        String proxy = System.getenv("HTTPS_PROXY");
        if (StringUtils.isBlank(proxy)) proxy = System.getenv("HTTP_PROXY");
        if (StringUtils.isNotBlank(proxy))
        {
            try
            {
                // 兼容 "http://127.0.0.1:7890" 与 "127.0.0.1:7890" 两种写法（后者 URI 解析会因非法 scheme 失败）
                String p = proxy.trim().replaceFirst("^[a-zA-Z][a-zA-Z0-9+.-]*://", "");
                int slash = p.indexOf('/');
                if (slash > 0) p = p.substring(0, slash);
                int idx = p.lastIndexOf(':');
                String host = idx > 0 ? p.substring(0, idx) : p;
                int port = idx > 0 ? Integer.parseInt(p.substring(idx + 1)) : 80;
                if (StringUtils.isNotBlank(host))
                {
                    b.proxy(ProxySelector.of(new InetSocketAddress(host, port)));
                }
            }
            catch (Exception e)
            {
                log.warn("解析代理失败，改直连：{}", e.getMessage());
            }
        }
        return b.build();
    }

    private String extractAnswer(String raw)
    {
        if (StringUtils.isBlank(raw))
        {
            return null;
        }
        String trimmed = raw.trim();
        try
        {
            JsonNode root = JSON.readTree(trimmed);
            JsonNode content = root.path("choices").path(0).path("message").path("content");
            if (content.isTextual() && StringUtils.isNotBlank(content.asText()) && !degraded(content.asText()))
            {
                return stripFence(content.asText());
            }
            JsonNode text = root.path("choices").path(0).path("text");
            if (text.isTextual() && StringUtils.isNotBlank(text.asText()) && !degraded(text.asText()))
            {
                return stripFence(text.asText());
            }
        }
        catch (Exception ignored)
        {
            // 纯文本响应
        }
        // HTML 错误页、JSON 体（无有效 content，如推理模型的 reasoning 响应）都不能当回答
        if (trimmed.startsWith("<") || trimmed.startsWith("{") || trimmed.startsWith("[") || degraded(trimmed))
        {
            return null;
        }
        String lower = trimmed.toLowerCase();
        if (lower.contains("rate limit") || lower.contains("too many requests") || lower.contains("请求过于频繁"))
        {
            return null;
        }
        return stripFence(trimmed);
    }

    private static boolean degraded(String ans)
    {
        if (StringUtils.isBlank(ans))
        {
            return true;
        }
        String a = ans.toLowerCase();
        return a.contains("chat/completions endpoint") || a.contains("the /v1/") || a.contains("openai api");
    }

    private static String stripFence(String s)
    {
        return s.trim().replaceAll("^```(?:json|text|markdown)?\\s*", "").replaceAll("\\s*```$", "").trim();
    }

    private List<Map<String, String>> sanitize(List<Map<String, String>> messages)
    {
        List<Map<String, String>> out = new ArrayList<>();
        if (messages == null)
        {
            return out;
        }
        int start = Math.max(0, messages.size() - MAX_MESSAGES);
        for (int i = start; i < messages.size(); i++)
        {
            Map<String, String> m = messages.get(i);
            if (m == null)
            {
                continue;
            }
            String role = m.get("role");
            String content = m.get("content");
            if (StringUtils.isBlank(content))
            {
                continue;
            }
            if (!"user".equals(role) && !"assistant".equals(role))
            {
                role = "user";
            }
            Map<String, String> one = new LinkedHashMap<>();
            one.put("role", role);
            one.put("content", content.length() > MAX_CHARS_PER_MESSAGE
                    ? content.substring(0, MAX_CHARS_PER_MESSAGE) : content);
            out.add(one);
        }
        return out;
    }

    private static String lastUserText(List<Map<String, String>> messages)
    {
        for (int i = messages.size() - 1; i >= 0; i--)
        {
            if ("user".equals(messages.get(i).get("role")))
            {
                return messages.get(i).get("content");
            }
        }
        return "";
    }

    /** 模型不可用时的本地规则回复 */
    private String localReply(String text, String scene)
    {
        String t = text == null ? "" : text;
        if (has(t, "你好", "您好", "在吗", "hi", "hello", "嗨"))
        {
            return "你好呀 🐾 我是小爪，可以帮你选宠物、查订单预约、解答养护问题。想了解哪方面？";
        }
        if (has(t, "订单", "物流", "发货", "快递", "付款", "支付"))
        {
            return "订单和购物车可以在「我的订单」里查看进度：/shop/order 。想让我看具体某一笔，登录后告诉我商品或时间就行。";
        }
        if (has(t, "预约", "看宠", "到店", "上门"))
        {
            return "预约看宠在宠物详情页点「立即预约看宠」，提交后可在「我的预约」查看状态。需要我帮你挑一只吗？";
        }
        if (has(t, "生病", "拉稀", "呕吐", "发烧", "咳嗽", "不吃", "精神差", "疫苗", "驱虫"))
        {
            return "这类情况建议尽快咨询「宠物医生」在线问诊；出现持续呕吐、便血、抽搐请立即就医，不要自行喂药。";
        }
        if (has(t, "售后", "退", "换", "赔偿", "保障"))
        {
            return "我们提供健康筛查、真实信息、专业养护、售后无忧四项保障，可在「服务保障」查看细则，也可以联系客服人工处理。";
        }
        if (has(t, "粮", "猫粮", "狗粮", "零食", "罐头"))
        {
            return "宠物粮在「宠物粮」频道，按猫狗、年龄和功效分了类。告诉我你家宠物品种和年龄，我可以帮你挑。";
        }
        if (has(t, "推荐", "适合", "养什么", "想养", "帮我挑", "匹配", "选一只", "什么猫", "什么狗"))
        {
            String rec = localRecommend(t);
            if (StringUtils.isNotBlank(rec))
            {
                return rec;
            }
            Map<String, String> a = localParse(t);
            String kw = a.get("_keywords");
            return "可以在「AI 选宠」用一句话描述需求，系统会直接给出匹配度排名。"
                    + (StringUtils.isNotBlank(kw) ? "我从你的描述里识别到：" + kw + "。" : "");
        }
        if (has(t, "多少钱", "价格", "贵"))
        {
            return "在售宠物价格从几百到上万元不等，详情页会标注价格与月均养护成本。告诉我预算和偏好，我帮你筛。";
        }
        return "我是宠物之家的 AI 助手小爪 🐾 可以帮你：选宠物、预约看宠、查订单与预约、解答养宠和健康问题。你想先了解哪一项？";
    }

    /** 降级模式下的「智能推荐」：直接调用现有匹配引擎算 Top3，让助手在没有模型时也能给出真实建议 */
    @SuppressWarnings("unchecked")
    private String localRecommend(String text)
    {
        if (matchService == null)
        {
            return null;
        }
        try
        {
            Map<String, String> a = localParse(text);
            a.remove("_keywords");
            Map<String, Object> res = matchService.recommend(new LinkedHashMap<>(a));
            Object obj = res.get("recommendations");
            if (!(obj instanceof List))
            {
                return null;
            }
            List<Map<String, Object>> list = (List<Map<String, Object>>) obj;
            if (list.isEmpty())
            {
                // 无匹配：把后端诊断出的原因与建议直接告诉用户，而不是沉默
                StringBuilder sb = new StringBuilder();
                Object summary = res.get("summary");
                sb.append(summary == null ? "按当前条件暂时没有合适的宠物。" : String.valueOf(summary));
                Object diag = res.get("diagnosis");
                if (diag instanceof Map)
                {
                    Object tips = ((Map<String, Object>) diag).get("tips");
                    if (tips instanceof List)
                    {
                        for (Object t : (List<Object>) tips)
                        {
                            sb.append("\n· ").append(String.valueOf(t));
                        }
                    }
                }
                return sb.toString().trim();
            }
            StringBuilder sb = new StringBuilder();
            String summary = String.valueOf(res.getOrDefault("summary", ""));
            if (StringUtils.isNotBlank(summary))
            {
                sb.append(summary).append("\n");
            }
            int n = Math.min(3, list.size());
            for (int i = 0; i < n; i++)
            {
                Map<String, Object> p = list.get(i);
                sb.append("· ").append(p.get("petName"));
                String breed = String.valueOf(p.get("breed"));
                if (StringUtils.isNotBlank(breed) && !"null".equals(breed))
                {
                    sb.append("（").append(breed).append("）");
                }
                sb.append(" ¥").append(fmtPrice(p.get("price"))).append("，匹配度 ").append(p.get("score")).append("%");
                Object rs = p.get("reasons");
                if (rs instanceof List && !((List<?>) rs).isEmpty())
                {
                    sb.append("，").append(((List<?>) rs).get(0));
                }
                sb.append("\n");
            }
            sb.append("想看完整报告可以打开「AI 选宠」，或点宠物卡片看详情。");
            return sb.toString();
        }
        catch (Exception e)
        {
            log.warn("本地推荐失败：{}", e.getMessage());
            return null;
        }
    }

    private static String fmtPrice(Object v)
    {
        if (v == null)
        {
            return "面议";
        }
        try
        {
            return String.format("%,.0f", Double.parseDouble(v.toString()));
        }
        catch (Exception e)
        {
            return v.toString();
        }
    }

    /** 去掉模型输出里的 Markdown 标记：前端按纯文本渲染，留着星号会很难看 */
    private static String cleanMarkdown(String s)
    {
        if (s == null)
        {
            return null;
        }
        return s.replaceAll("\\*\\*(.+?)\\*\\*", "$1")
                .replaceAll("__(.+?)__", "$1")
                .replaceAll("(?m)^#{1,6}\\s*", "")
                .replaceAll("`([^`]+)`", "$1")
                .trim();
    }

    private static String nvl(String s)
    {
        return s == null ? "" : s;
    }

    private static String shorten(String s, int max)
    {
        if (s == null)
        {
            return "";
        }
        String t = s.replaceAll("\\s+", " ").trim();
        return t.length() <= max ? t : t.substring(0, max) + "…";
    }
}
