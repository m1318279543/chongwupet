package com.ruoyi.system.ai;

import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAiConversation;
import com.ruoyi.system.domain.PetAiMessage;
import com.ruoyi.system.domain.PetConsult;
import com.ruoyi.system.domain.PetKnowledge;
import com.ruoyi.system.mapper.PetAiConversationMapper;
import com.ruoyi.system.service.IPetConsultService;
import com.ruoyi.system.service.IPetOrderService;

/**
 * 助手编排：场景路由 → 取业务数据/知识 → 生成 → 引用与动作 → 落库。
 *
 * 生成策略：先用本地模板把事实组织好；配置了模型再让它改写措辞。
 * 这样即使模型不可用、或模型产生幻觉，回答里的事实仍然来自数据库。
 *
 * @author ruoyi
 */
@Service
public class AssistantService
{
    private static final Logger log = LoggerFactory.getLogger(AssistantService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final SimpleDateFormat DATETIME = new SimpleDateFormat("yyyy-MM-dd HH:mm");

    private static final String[] ORDER_STATUS = { "待付款", "待发货/待自提", "已完成", "已取消" };
    private static final String[] PAY_STATUS = { "未支付", "已支付", "已退款" };
    private static final String[] APPOINTMENT_STATUS = { "待处理", "已确认", "已完成", "已取消" };

    /** 具体日期：10-28 / 10/28 / 10月28 */
    private static final Pattern DATE_HINT = Pattern.compile("(\\d{1,2})\\s*[月/-]\\s*(\\d{1,2})");
    /** 具体时间：15:30 / 下午3点 / 9点 */
    private static final Pattern TIME_HINT = Pattern.compile("(\\d{1,2})\\s*[:：点时]\\s*(\\d{0,2})");
    /** 中文时间：下午三点 / 十点半 / 晚上八点 */
    private static final Pattern TIME_CN = Pattern.compile(
            "([零一二三四五六七八九十两]{1,3})\\s*[点时]\\s*(半|[零一二三四五六七八九十]{1,2}分?)?");
    private static final String CN_DIGITS = "零一二三四五六七八九";

    @Autowired
    private AssistantTools tools;

    @Autowired
    private KnowledgeService knowledgeService;

    @Autowired
    private LlmClient llmClient;

    @Autowired
    private AiProperties properties;

    @Autowired
    private AiGuard guard;

    @Autowired
    private PetAiConversationMapper conversationMapper;

    @Autowired
    private IPetConsultService petConsultService;

    @Autowired
    private IPetOrderService petOrderService;

    @Autowired
    private com.ruoyi.system.service.IPetDashboardService petDashboardService;

    /** 一次问答的产物 */
    public static class Answer
    {
        public Long convId;
        public Long msgId;
        public String content = "";
        public List<Map<String, Object>> blocks = new ArrayList<>();
        public List<Map<String, Object>> citations = new ArrayList<>();
        public List<Map<String, Object>> actions = new ArrayList<>();
        public List<String> tools = new ArrayList<>();
        public String source = "local";
        public boolean handoff;
        public String intent;

        public Map<String, Object> toPayload()
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("convId", convId);
            m.put("msgId", msgId);
            m.put("content", content);
            m.put("blocks", blocks);
            m.put("citations", citations);
            m.put("actions", actions);
            m.put("source", source);
            m.put("handoff", handoff);
            m.put("intent", intent);
            return m;
        }
    }

    /** 请求参数 */
    public static class ChatRequest
    {
        public Long convId;
        public String scene = "shop";
        public String bizId;
        public String message;
        public Long petId;
        public String orderNo;
        public Map<String, Object> answers;
        /** 是否具备经营数据权限：必须在请求线程里判定后传入，线程池里取不到 SecurityContext */
        public boolean canViewMetric;
    }

    /**
     * 处理一次提问。
     *
     * @param onDelta 非空时按流式回调（仅模型通道有效，本地模板一次性回调）
     */
    public Answer chat(ChatRequest req, Long userId, String userName, Consumer<String> onDelta)
    {
        long started = System.currentTimeMillis();
        Answer answer = new Answer();
        if (req == null || StringUtils.isBlank(req.message))
        {
            answer.content = "想了解点什么？可以直接描述你的问题，比如「我想养一只不掉毛的猫」。";
            return answer;
        }
        String message = req.message.trim();
        if (message.length() > 500)
        {
            message = message.substring(0, 500);
        }

        if ("admin_consult".equals(req.scene))
        {
            answer.intent = SceneRouter.INTENT_DRAFT;
            answer = route(SceneRouter.INTENT_DRAFT, req, message, userId, userName, answer);
        }
        else
        {
            String emergency = guard.emergencyWord(message);
            if (emergency != null)
            {
                answer = emergencyAnswer(message, emergency);
            }
            else
            {
                String intent = SceneRouter.route(req.scene, message, req.petId);
                answer.intent = intent;
                answer = route(intent, req, message, userId, userName, answer);
            }
        }

        // 模型主导生成：门店数据作为已核实事实注入上下文，
        // 由 Pollinations 大模型生成最终回答；模型不可用时才降级为本地模板。
        if (llmClient.available())
        {
            // 记录是否已有增量输出：流式出字后再降级会导致模板全文叠加，必须跳过
            boolean[] streamed = { false };
            Consumer<String> wrapped = onDelta == null ? null
                    : delta -> { streamed[0] = true; onDelta.accept(delta); };
            String generated = generate(req.scene, message, answer, wrapped);
            if (StringUtils.isNotBlank(generated))
            {
                answer.content = cleanMarkdown(generated);
                answer.source = "openai";
            }
            else if (onDelta != null && !streamed[0])
            {
                onDelta.accept(answer.content);
            }
        }
        else if (onDelta != null)
        {
            onDelta.accept(answer.content);
        }

        persist(req, message, answer, userId, userName, (int) (System.currentTimeMillis() - started));
        return answer;
    }

    private Answer route(String intent, ChatRequest req, String message, Long userId, String userName, Answer answer)
    {
        switch (intent)
        {
            case SceneRouter.INTENT_PET:
                return petAnswer(req.petId, answer);
            case SceneRouter.INTENT_MATCH:
                return matchAnswer(req, message, answer);
            case SceneRouter.INTENT_ORDER_DETAIL:
                return orderDetailAnswer(SceneRouter.orderNo(message), userId, answer);
            case SceneRouter.INTENT_ORDER_LIST:
                return orderListAnswer(userId, answer);
            case SceneRouter.INTENT_APPOINTMENT:
                return appointmentAnswer(req, message, userId, answer);
            case SceneRouter.INTENT_SLOTS:
                return slotsAnswer(message, answer);
            case SceneRouter.INTENT_STORES:
                return storeAnswer(answer);
            case SceneRouter.INTENT_GOODS:
                return goodsAnswer(message, answer);
            case SceneRouter.INTENT_MY_PETS:
                return myPetsAnswer(userId, answer);
            case SceneRouter.INTENT_PET_CARE:
                return petCareAnswer(req.petId, message, userId, answer);
            case SceneRouter.INTENT_METRIC:
                return metricAnswer(message, req.canViewMetric, answer);
            case SceneRouter.INTENT_DRAFT:
                return draftAnswer(req.bizId, answer);
            default:
                return knowledgeAnswer(message, null, answer);
        }
    }

    /* ---------- 各场景 ---------- */

    private Answer emergencyAnswer(String message, String word)
    {
        Answer answer = new Answer();
        answer.intent = "emergency";
        List<PetKnowledge> hits = knowledgeService.search(message, knowledgeService.detectSpecies(message), 2);
        StringBuilder sb = new StringBuilder();
        sb.append("「").append(word).append("」属于需要立即就医的情况，不建议在家观察或自行用药。\n\n");
        sb.append("请尽快联系就近的宠物医院；如果是猫排尿困难，超过 12 小时无尿可能危及生命。\n");
        if (!hits.isEmpty())
        {
            PetKnowledge top = hits.get(0);
            sb.append("\n可参考：").append(top.getTitle()).append("\n").append(abbreviate(top.getContent(), 160));
            answer.citations.add(citation(top));
            answer.blocks.add(knowledgeBlock(top));
        }
        sb.append("\n\n需要的话我可以帮你转人工客服，让门店协助联系医院。");
        answer.content = sb.toString();
        answer.handoff = true;
        answer.tools.add("knowledge.search");
        answer.actions.add(action("handoff", "转人工客服"));
        answer.actions.add(action("link", "查看门店与电话", "/shop/home#stores"));
        return answer;
    }

    private Answer petAnswer(Long petId, Answer answer)
    {
        if (petId == null)
        {
            return knowledgeAnswer("宠物信息", null, answer);
        }
        Map<String, Object> pet = tools.petDetail(petId);
        if (pet == null)
        {
            answer.content = "这只宠物已经下架或被订走了，可以看看其他在售的伙伴。";
            answer.actions.add(action("link", "看在售宠物", "/shop/pets"));
            return answer;
        }
        answer.tools.add("pet.detail");
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("type", "pet");
        block.put("data", pet);
        answer.blocks.add(block);

        StringBuilder sb = new StringBuilder();
        sb.append("「").append(pet.get("petName")).append("」")
          .append(StringUtils.isBlank((String) pet.get("breed")) ? "" : "是" + pet.get("breed"))
          .append(StringUtils.isBlank((String) pet.get("age")) ? "" : "，" + pet.get("age"))
          .append("，售价 ¥").append(pet.get("price")).append("。\n");
        if (pet.get("monthlyCost") != null)
        {
            sb.append("按同类主粮与日常护理估算，月均花费约 ¥").append(pet.get("monthlyCost")).append("。\n");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> health = (Map<String, Object>) pet.get("health");
        if (health == null)
        {
            sb.append("\n这只的在线健康档案还没填完整，到店时可以要求查看疫苗与体检原件。\n");
        }
        else
        {
            sb.append("\n健康档案：");
            sb.append(value(health.get("vaccine"), "疫苗记录待补")).append("，");
            sb.append(value(health.get("deworm"), "驱虫记录待补")).append("，");
            sb.append("体检").append(value(health.get("examResult"), "待补")).append("。\n");
            if (StringUtils.isNotBlank((String) health.get("temperament")))
            {
                sb.append("性格：").append(health.get("temperament")).append("。\n");
            }
            if (StringUtils.isNotBlank((String) health.get("feedPlan")))
            {
                sb.append("喂养建议：").append(health.get("feedPlan")).append("\n");
            }
            if (StringUtils.isNotBlank((String) health.get("carePoints")))
            {
                sb.append("护理要点：").append(health.get("carePoints")).append("\n");
            }
            if (health.get("guaranteeDays") != null)
            {
                sb.append("健康保障：").append(health.get("guaranteeDays")).append(" 天。\n");
            }
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> preference = (Map<String, Object>) pet.get("preference");
        if (preference != null && StringUtils.isNotBlank((String) preference.get("taboo")))
        {
            sb.append("特别注意：").append(preference.get("taboo")).append("。\n");
        }

        sb.append("\n要不要约个时间到店看看？我可以帮你走预约流程。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "立即预约看宠", "/shop/pet/" + petId));
        // 直接在当前对话里追问这只，而不是跳去选宠问卷：跳过去会丢掉刚看的这只
        Map<String, Object> ask = new LinkedHashMap<>();
        ask.put("petId", petId);
        ask.put("message", "这只宠物适合我吗？");
        answer.actions.add(actionData("ask", "问问是否适合我", ask));
        return answer;
    }

    private Answer matchAnswer(ChatRequest req, String message, Answer answer)
    {
        Map<String, Object> answers = req.answers;
        if (answers == null || answers.isEmpty())
        {
            answers = SceneRouter.parseAnswers(message);
            // 一句话只抽到一两个条件时不硬算：其余维度会落到后端默认档位，
            // 算出来的匹配度用户根本没参与，等于给一个假精确的数字。
            if (answers.size() < MIN_MATCH_SLOTS)
            {
                return askMoreMatch(answers, answer);
            }
        }
        else
        {
            // 带着选宠页的答卷进来时，允许当前这句话覆盖它明确提到的维度，
            // 否则用户说"换个大点的房子"会用回旧的空间条件，结果原地不动。
            Map<String, Object> patch = SceneRouter.parseAnswers(message);
            if (!patch.isEmpty())
            {
                answers = new LinkedHashMap<>(answers);
                answers.putAll(patch);
            }
        }
        Map<String, Object> result = tools.match(answers);
        answer.tools.add("match.recommend");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> list = (List<Map<String, Object>>) result.get("recommendations");
        StringBuilder sb = new StringBuilder();
        if (list == null || list.isEmpty())
        {
            sb.append("按你描述的条件，暂时没有完全匹配的在售宠物。");
            Object diagnosis = result.get("diagnosis");
            if (diagnosis instanceof Map)
            {
                Object cause = ((Map<?, ?>) diagnosis).get("rootCause");
                if ("budget".equals(cause))
                {
                    sb.append("主要是预算卡得比较紧，可以适当放宽，或先看看月均花费更低的品类。");
                }
                else if ("kids".equals(cause))
                {
                    sb.append("有小孩的家庭需要避开攻击性较强的品种，我可以按「儿童友好」重新筛一遍。");
                }
                else
                {
                    sb.append("可以放宽一个条件（比如空间或预算），我再帮你找找。");
                }
            }
            answer.handoff = true;
            answer.actions.add(action("handoff", "让店员帮我推荐"));
        }
        else
        {
            sb.append("按你的情况，我筛出 ").append(list.size()).append(" 只比较合适的：\n");
            int count = 0;
            for (Map<String, Object> one : list)
            {
                if (count++ >= 3)
                {
                    break;
                }
                sb.append("\n").append(count).append(". ").append(one.get("petName"))
                  .append("（").append(value(one.get("breed"), "品种待补")).append("）")
                  .append("，¥").append(one.get("price"))
                  .append("，月均约 ¥").append(one.get("monthlyCost"))
                  .append("，匹配度 ").append(one.get("score")).append("%\n");
                appendList(sb, "   匹配点：", one.get("reasons"), 2);
                appendList(sb, "   要注意：", one.get("cautions"), 1);

                Map<String, Object> block = new LinkedHashMap<>();
                block.put("type", "pet");
                block.put("data", one);
                answer.blocks.add(block);
            }
            sb.append("\n点开卡片可以看详情，也可以直接预约到店。");
            answer.actions.add(action("link", "看完整选宠结果", "/shop/match"));
        }
        answer.content = sb.toString();
        return answer;
    }

    /** 对话抽取到的匹配槽位少于这个数就不硬算，改为追问 */
    private static final int MIN_MATCH_SLOTS = 3;

    /**
     * 条件不足时的追问：先说清"已经收到哪些"，再列还缺的关键项，最后给一条通往完整测评的路。
     * 目的是避免用后端默认档位拼出一个用户没参与过的匹配度。
     */
    private Answer askMoreMatch(Map<String, Object> answers, Answer answer)
    {
        List<String> missing = new ArrayList<>();
        if (!answers.containsKey("home"))
        {
            missing.add("居住空间（小户型 / 普通住宅 / 带院子）");
        }
        if (!answers.containsKey("budget"))
        {
            missing.add("购宠预算大概多少");
        }
        if (!answers.containsKey("experience"))
        {
            missing.add("是不是第一次养");
        }
        if (!answers.containsKey("time"))
        {
            missing.add("每天能陪它多久");
        }
        if (!answers.containsKey("prefer"))
        {
            missing.add("想养猫、狗还是其他");
        }

        StringBuilder sb = new StringBuilder();
        sb.append(answers.isEmpty()
                ? "我可以按你的生活情况帮你筛，先告诉我几件事：\n"
                : "我记下了你的部分条件，再确认几件事就能筛得更准：\n");
        int shown = 0;
        for (String item : missing)
        {
            if (shown++ >= 3)
            {
                break;
            }
            sb.append("· ").append(item).append("\n");
        }
        sb.append("\n也可以直接做完整测评，10 道题一次选完，结果带七维评分和逐条推荐理由。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "做完整测评", "/shop/match"));
        return answer;
    }

    private Answer orderListAnswer(Long userId, Answer answer)
    {
        if (userId == null)
        {
            answer.content = "查订单需要先登录。登录后我就能看到你的订单状态、支付情况和退款进度。";
            answer.actions.add(action("login", "去登录"));
            return answer;
        }
        List<Map<String, Object>> orders = tools.myOrders(userId, 5);
        answer.tools.add("order.mine");
        if (orders.isEmpty())
        {
            answer.content = "你还没有订单记录。如果想看看在售宠物或宠物粮，我可以帮你找。";
            answer.actions.add(action("link", "去逛逛", "/shop/pets"));
            return answer;
        }
        StringBuilder sb = new StringBuilder("你最近的订单：\n");
        for (Map<String, Object> one : orders)
        {
            sb.append("\n").append(one.get("orderNo"))
              .append(" · ").append(status(ORDER_STATUS, one.get("status")))
              .append(" · ¥").append(one.get("payAmount"))
              .append("（").append(value(one.get("firstItem"), "商品")).append("）\n");
            sb.append("   ").append(orderHint(one)).append("\n");

            Map<String, Object> block = new LinkedHashMap<>();
            block.put("type", "order");
            block.put("data", one);
            answer.blocks.add(block);
        }
        sb.append("\n把订单号发给我，我可以看具体明细；需要退款的话，已支付且未取消的订单可以在订单页直接申请。");
        answer.actions.add(action("link", "打开我的订单", "/shop/order"));
        answer.content = sb.toString();
        return answer;
    }

    private Answer orderDetailAnswer(String orderNo, Long userId, Answer answer)
    {
        if (userId == null)
        {
            answer.content = "查订单明细需要先登录，登录后把订单号再发我一次就行。";
            answer.actions.add(action("login", "去登录"));
            return answer;
        }
        if (StringUtils.isBlank(orderNo))
        {
            return orderListAnswer(userId, answer);
        }
        Map<String, Object> order = tools.orderDetail(orderNo, userId);
        answer.tools.add("order.detail");
        if (order == null)
        {
            answer.content = "没有查到这个订单号，或者它不属于当前账号。可以核对一下订单号（以 ORD 开头）。";
            answer.actions.add(action("link", "打开我的订单", "/shop/order"));
            return answer;
        }
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("type", "order");
        block.put("data", order);
        answer.blocks.add(block);

        StringBuilder sb = new StringBuilder();
        sb.append("订单 ").append(order.get("orderNo")).append("：\n");
        sb.append("状态：").append(status(ORDER_STATUS, order.get("status")))
          .append(" · ").append(status(PAY_STATUS, order.get("payStatus"))).append("\n");
        sb.append("金额：¥").append(order.get("payAmount")).append("\n");
        sb.append("下单时间：").append(order.get("createTime")).append("\n");
        if (order.get("items") instanceof List && !((List<?>) order.get("items")).isEmpty())
        {
            sb.append("商品：");
            List<?> items = (List<?>) order.get("items");
            for (int i = 0; i < items.size() && i < 3; i++)
            {
                Object item = items.get(i);
                if (item instanceof Map)
                {
                    Map<?, ?> line = (Map<?, ?>) item;
                    sb.append(line.get("name")).append(" ×").append(line.get("qty"));
                    if (i < Math.min(items.size(), 3) - 1)
                    {
                        sb.append("，");
                    }
                }
            }
            sb.append("\n");
        }
        sb.append("\n").append(orderHint(order));
        answer.content = sb.toString();
        answer.actions.add(action("link", "打开订单详情", "/shop/order"));
        return answer;
    }

    private Answer appointmentAnswer(ChatRequest req, String message, Long userId, Answer answer)
    {
        if (userId == null)
        {
            answer.content = "预约看宠需要先登录。登录后可以在宠物详情页选择门店和时段，提交后会生成接待安排。";
            answer.actions.add(action("login", "去登录"));
            return answer;
        }
        // 明确说要约：进入代预约确认流程；否则先看已有预约
        if (SceneRouter.contains(message, "帮我约", "帮我预约", "预约看", "约个时间", "定个时间", "约一下", "想约", "约明天", "约后天", "约今天"))
        {
            return draftAppointment(req.petId, message, userId, answer);
        }
        List<Map<String, Object>> list = tools.myAppointments(userId, 5);
        answer.tools.add("appointment.mine");
        StringBuilder sb = new StringBuilder();
        if (list.isEmpty())
        {
            sb.append("你还没有预约记录。在宠物详情页点「立即预约看宠」，选门店和时间就行，预约不收费。");
        }
        else
        {
            sb.append("你的预约：\n");
            for (Map<String, Object> one : list)
            {
                sb.append("\n· ").append(value(one.get("petName"), "看宠"))
                  .append(" · ").append(one.get("appointmentDate"))
                  .append(" · ").append(status(APPOINTMENT_STATUS, one.get("status"))).append("\n");
                Map<String, Object> block = new LinkedHashMap<>();
                block.put("type", "appointment");
                block.put("data", one);
                answer.blocks.add(block);
            }
            sb.append("\n需要改期的话，先取消原预约再重新选时段；取消后门店和关联工单会同步取消。");
        }
        answer.actions.add(action("link", "我的预约", "/shop/appointment"));
        answer.content = sb.toString();
        return answer;
    }

    /** 代预约：先把要素凑齐，生成确认卡，用户点确认才会真正提交 */
    private Answer draftAppointment(Long petId, String message, Long userId, Answer answer)
    {
        List<Map<String, Object>> pets = tools.myPets(userId);
        if (pets.isEmpty())
        {
            answer.content = "你的账号下还没有宠物档案，预约前需要先建客户档案。可以让客服协助处理。";
            answer.actions.add(action("handoff", "让客服帮我建档"));
            answer.handoff = true;
            return answer;
        }

        Long target = petId;
        String petName = null;
        if (target != null && !tools.ownsPet(target, userId))
        {
            target = null;
        }
        if (target == null)
        {
            com.ruoyi.system.domain.PetOwner matched = tools.matchMyPet(userId, message);
            if (matched != null)
            {
                target = matched.getPetId();
                petName = matched.getPetName();
            }
        }
        if (target == null && pets.size() == 1)
        {
            target = toLong(pets.get(0).get("petId"));
            petName = String.valueOf(pets.get(0).get("petName"));
        }
        if (target == null)
        {
            StringBuilder sb = new StringBuilder("想约哪一只？说名字就行，比如「帮我约").append(pets.get(0).get("petName")).append("明天下午三点」。\n");
            for (Map<String, Object> one : pets)
            {
                sb.append("\n· ").append(one.get("petName"))
                  .append("（").append(value(one.get("breed"), "品种待补")).append("）");
                Map<String, Object> block = new LinkedHashMap<>();
                block.put("type", "mypet");
                block.put("data", one);
                answer.blocks.add(block);
            }
            answer.content = sb.toString();
            return answer;
        }
        if (petName == null)
        {
            for (Map<String, Object> one : pets)
            {
                if (target.equals(toLong(one.get("petId"))))
                {
                    petName = String.valueOf(one.get("petName"));
                    break;
                }
            }
        }

        if (!hasDate(message))
        {
            answer.content = "想约哪天？说「明天」「后天」或者具体日期都行，我再把时间和你确认一次。";
            return answer;
        }
        String date = dateFrom(message);
        String time = timeFrom(message);
        boolean defaultTime = time == null;
        if (defaultTime)
        {
            time = "10:00";
        }
        Long storeId = tools.customerStoreId(userId);
        if (storeId == null)
        {
            storeId = storeIdFrom(message);
        }
        String storeName = tools.storeName(storeId);
        String phone = tools.customerPhone(userId);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("petId", target);
        data.put("petName", petName);
        data.put("storeId", storeId);
        data.put("storeName", storeName);
        data.put("date", date);
        data.put("time", time);
        data.put("contactPhone", phone);

        StringBuilder sb = new StringBuilder("我整理好了，确认无误我再提交：\n");
        sb.append("\n· 宠物：").append(petName);
        sb.append("\n· 门店：").append(StringUtils.isBlank(storeName) ? "默认门店" : storeName);
        sb.append("\n· 时间：").append(date).append(" ").append(time);
        if (StringUtils.isNotBlank(phone))
        {
            sb.append("\n· 联系电话：").append(phone);
        }
        else
        {
            sb.append("\n· 联系电话：确认时会让你补一个");
        }
        if (defaultTime)
        {
            sb.append("\n\n你没说具体几点，我先按 ").append(time).append(" 排；要改时间直接告诉我。");
        }
        sb.append("\n\n预约不收费，提交后门店会联系你确认。");
        answer.content = sb.toString();
        answer.actions.add(actionData("appointment_create", "确认提交预约", data));
        answer.actions.add(action("link", "自己选时段", "/shop/pets"));
        return answer;
    }

    private static boolean hasDate(String message)
    {
        if (SceneRouter.contains(message, "今天", "明天", "后天", "今晚", "明早", "明晚"))
        {
            return true;
        }
        return message != null && DATE_HINT.matcher(message).find();
    }

    /** 从"下午三点""15:30""9点"里取时间，取不到返回 null */
    private static String timeFrom(String message)
    {
        if (StringUtils.isBlank(message))
        {
            return null;
        }
        Matcher matcher = TIME_HINT.matcher(message);
        if (matcher.find())
        {
            int hour;
            try
            {
                hour = Integer.parseInt(matcher.group(1));
            }
            catch (Exception e)
            {
                return null;
            }
            String minuteText = matcher.group(2);
            int minute = StringUtils.isBlank(minuteText) ? 0 : Integer.parseInt(minuteText.replace("分", ""));
            return clock(message, hour, minute);
        }
        Matcher cn = TIME_CN.matcher(message);
        if (cn.find())
        {
            int hour = cnNumber(cn.group(1));
            if (hour < 0)
            {
                return null;
            }
            String minuteText = cn.group(2);
            int minute = 0;
            if ("半".equals(minuteText))
            {
                minute = 30;
            }
            else if (StringUtils.isNotBlank(minuteText))
            {
                int parsed = cnNumber(minuteText.replace("分", ""));
                if (parsed >= 0 && parsed < 60)
                {
                    minute = parsed;
                }
            }
            return clock(message, hour, minute);
        }
        return null;
    }

    private static String clock(String message, int hour, int minute)
    {
        if (hour > 23 || minute > 59)
        {
            return null;
        }
        if ((message.contains("下午") || message.contains("晚上") || message.contains("傍晚")) && hour < 12)
        {
            hour += 12;
        }
        return String.format("%02d:%02d", hour, minute);
    }

    /** 中文数字转整数：三 → 3、十 → 10、十二 → 12、二十 → 20 */
    private static int cnNumber(String text)
    {
        if (StringUtils.isBlank(text))
        {
            return -1;
        }
        String value = text.replace("两", "二");
        int ten = value.indexOf('十');
        if (ten < 0)
        {
            return CN_DIGITS.indexOf(value.charAt(0));
        }
        int high = ten == 0 ? 1 : CN_DIGITS.indexOf(value.charAt(0));
        int low = ten == value.length() - 1 ? 0 : CN_DIGITS.indexOf(value.charAt(ten + 1));
        return high < 0 || low < 0 ? -1 : high * 10 + low;
    }

    private Answer slotsAnswer(String message, Answer answer)
    {
        Long storeId = storeIdFrom(message);
        String date = dateFrom(message);
        List<Map<String, Object>> slots = tools.slots(storeId, date);
        answer.tools.add("appointment.slots");
        if (slots.isEmpty())
        {
            answer.content = "这个时段暂时没有可预约名额，可以换一天，或直接联系门店安排。";
            answer.actions.add(action("link", "去预约", "/shop/pets"));
            return answer;
        }
        StringBuilder sb = new StringBuilder();
        sb.append(date).append(" 可预约时段：\n");
        int count = 0;
        for (Map<String, Object> one : slots)
        {
            if (count++ >= 6)
            {
                break;
            }
            sb.append("· ").append(one.get("label") == null ? one.get("time") : one.get("label"));
            Object remain = one.get("remain");
            if (remain != null)
            {
                sb.append("（剩余 ").append(remain).append(" 位）");
            }
            sb.append("\n");
        }
        sb.append("\n选好时间后在宠物详情页提交预约即可。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "去选宠物", "/shop/pets"));
        return answer;
    }

    private Answer storeAnswer(Answer answer)
    {
        List<Map<String, Object>> stores = tools.stores();
        answer.tools.add("store.list");
        if (stores.isEmpty())
        {
            answer.content = "门店信息暂时不可用，可以直接拨打客服电话 023-8888 0001。";
            return answer;
        }
        StringBuilder sb = new StringBuilder("我们在重庆有 ").append(stores.size()).append(" 家门店：\n");
        for (Map<String, Object> one : stores)
        {
            sb.append("\n· ").append(one.get("storeName"))
              .append("\n  ").append(value(one.get("address"), "地址待补"))
              .append("\n  ").append(value(one.get("businessHours"), "营业时间待补"))
              .append(" · ").append(value(one.get("phone"), ""));
            Map<String, Object> block = new LinkedHashMap<>();
            block.put("type", "store");
            block.put("data", one);
            answer.blocks.add(block);
        }
        sb.append("\n\n建议到店前先预约，门店会安排独立接待时间。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "预约看宠", "/shop/appointment"));
        return answer;
    }

    private Answer goodsAnswer(String message, Answer answer)
    {
        String cat = catOf(SceneRouter.prefer(message));
        String keyword = goodsKeyword(message);
        List<Map<String, Object>> goods = tools.searchGoods(keyword, cat, 3);
        // 关键词太具体（如"咨询一些关于狗粮"）召回为空时，退回按品类直接取在售商品
        if (goods.isEmpty() && StringUtils.isNotBlank(keyword))
        {
            goods = tools.searchGoods(null, cat, 3);
        }
        answer.tools.add("goods.search");
        if (goods.isEmpty())
        {
            answer.content = "没有找到匹配的宠物粮。可以告诉我宠物的品种、年龄，或者直接说预算，我再筛一遍。";
            answer.actions.add(action("link", "去宠物粮专区", "/shop/food"));
            return answer;
        }
        StringBuilder sb = new StringBuilder("按你提到的条件，这几款比较合适：\n");
        for (Map<String, Object> one : goods)
        {
            sb.append("\n· ").append(one.get("goodsName")).append("（").append(value(one.get("spec"), "")).append("）")
              .append(" ¥").append(one.get("price"));
            Object stock = one.get("stock");
            sb.append(Number.class.isInstance(stock) && ((Number) stock).intValue() <= 0 ? " · 暂时缺货" : " · 有货");
            sb.append("\n");
            if (StringUtils.isNotBlank((String) one.get("feeding")))
            {
                sb.append("  喂食建议：").append(abbreviate((String) one.get("feeding"), 60)).append("\n");
            }
            Map<String, Object> block = new LinkedHashMap<>();
            block.put("type", "goods");
            block.put("data", one);
            answer.blocks.add(block);
        }
        sb.append("\n换粮记得用 7 天过渡法，避免软便。");
        // 明确说要买：只对第一款出确认按钮，避免一次塞多个加购入口
        if (SceneRouter.contains(message, "加入购物车", "加购", "来一袋", "来一包", "买一袋", "买一包", "要这个", "就要这个"))
        {
            Map<String, Object> first = goods.get(0);
            if (Number.class.isInstance(first.get("stock")) && ((Number) first.get("stock")).intValue() <= 0)
            {
                sb.append("\n这款暂时缺货，先别下单，可以让客服通知到货。");
            }
            else
            {
                sb.append("\n确认要的话点下面的按钮，我把它放进购物车，结算前还能删。");
                answer.actions.add(actionData("cart_add", "加入购物车 · " + first.get("goodsName"), first));
            }
        }
        answer.content = sb.toString();
        answer.actions.add(action("link", "去宠物粮专区", "/shop/food"));
        return answer;
    }

    /** 我的宠物清单 */
    private Answer myPetsAnswer(Long userId, Answer answer)
    {
        if (userId == null)
        {
            answer.content = "查看「我的宠物」需要先登录。登录后我能看到每只宠物的品种、年龄、疫苗和驱虫记录。";
            answer.actions.add(action("login", "去登录"));
            return answer;
        }
        List<Map<String, Object>> pets = tools.myPets(userId);
        answer.tools.add("pet.mine");
        if (pets.isEmpty())
        {
            answer.content = "你的账号下还没有宠物档案。\n如果是刚接回家的宠物，可以让门店在客户档案里补录，之后疫苗、驱虫和体检记录都会同步到这里。";
            answer.actions.add(action("link", "去看看在售宠物", "/shop/pets"));
            answer.actions.add(action("handoff", "让客服帮我建档"));
            answer.handoff = true;
            return answer;
        }
        StringBuilder sb = new StringBuilder("你名下有 ").append(pets.size()).append(" 只宠物：\n");
        for (Map<String, Object> one : pets)
        {
            sb.append("\n· ").append(one.get("petName"))
              .append("（").append(value(one.get("breed"), "品种待补"));
            if (StringUtils.isNotBlank((String) one.get("age")))
            {
                sb.append(" · ").append(one.get("age"));
            }
            sb.append("）");
            if (StringUtils.isNotBlank((String) one.get("reminder")))
            {
                sb.append("\n  ").append(one.get("reminder"));
            }
            sb.append("\n");

            Map<String, Object> block = new LinkedHashMap<>();
            block.put("type", "mypet");
            block.put("data", one);
            answer.blocks.add(block);
        }
        sb.append("\n想了解哪只的疫苗、驱虫或喂养，直接说名字就行。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "宠物档案", "/shop/mypet"));
        return answer;
    }

    /** 某只宠物的养护档案 */
    private Answer petCareAnswer(Long petId, String message, Long userId, Answer answer)
    {
        if (userId == null)
        {
            answer.content = "查看宠物档案需要先登录。登录后我能按名字查到疫苗、驱虫和体检记录。";
            answer.actions.add(action("login", "去登录"));
            return answer;
        }
        List<Map<String, Object>> pets = tools.myPets(userId);
        answer.tools.add("pet.care");
        if (pets.isEmpty())
        {
            answer.content = "你的账号下还没有宠物档案，暂时查不到疫苗和驱虫记录。可以让门店先补录客户档案。";
            answer.actions.add(action("handoff", "让客服帮我建档"));
            answer.handoff = true;
            return answer;
        }

        Long target = petId;
        if (target == null)
        {
            com.ruoyi.system.domain.PetOwner matched = tools.matchMyPet(userId, message);
            if (matched != null)
            {
                target = matched.getPetId();
            }
        }
        if (target == null)
        {
            if (pets.size() == 1)
            {
                target = toLong(pets.get(0).get("petId"));
            }
            else
            {
                StringBuilder sb = new StringBuilder("你名下有 ").append(pets.size())
                        .append(" 只宠物，想了解哪一只？\n");
                for (Map<String, Object> one : pets)
                {
                    sb.append("\n· ").append(one.get("petName"))
                      .append("（").append(value(one.get("breed"), "品种待补")).append("）");
                    Map<String, Object> block = new LinkedHashMap<>();
                    block.put("type", "mypet");
                    block.put("data", one);
                    answer.blocks.add(block);
                }
                sb.append("\n\n直接说名字，比如「").append(pets.get(0).get("petName")).append("该打疫苗了吗」。");
                answer.content = sb.toString();
                return answer;
            }
        }

        Map<String, Object> care = tools.petCare(target, userId);
        if (care == null)
        {
            answer.content = "没有找到这只宠物的档案，或者它不在你的名下。";
            answer.actions.add(action("link", "看我的宠物", "/shop/mypet"));
            return answer;
        }

        Map<String, Object> block = new LinkedHashMap<>();
        block.put("type", "care");
        block.put("data", care);
        answer.blocks.add(block);

        StringBuilder sb = new StringBuilder();
        sb.append(care.get("petName")).append("（").append(value(care.get("breed"), "品种待补"));
        if (StringUtils.isNotBlank((String) care.get("age")))
        {
            sb.append(" · ").append(care.get("age"));
        }
        sb.append("）\n");

        Map<?, ?> health = care.get("health") instanceof Map ? (Map<?, ?>) care.get("health") : null;
        if (health == null)
        {
            sb.append("\n健康档案还没建：疫苗、驱虫、体检记录都查不到。可以到店让医生补录，之后我就能提醒到期时间。");
            answer.handoff = true;
            answer.actions.add(action("handoff", "让客服帮我建档"));
        }
        else
        {
            sb.append("\n健康档案\n");
            if (StringUtils.isNotBlank((String) health.get("vaccine")))
            {
                sb.append("· 疫苗：").append(health.get("vaccine"));
                if (StringUtils.isNotBlank((String) health.get("vaccineDate")))
                {
                    sb.append("（").append(health.get("vaccineDate")).append("）");
                }
                sb.append("\n");
            }
            if (StringUtils.isNotBlank((String) health.get("deworm")))
            {
                sb.append("· 驱虫：").append(health.get("deworm"));
                if (StringUtils.isNotBlank((String) health.get("dewormDate")))
                {
                    sb.append("（").append(health.get("dewormDate")).append("）");
                }
                sb.append("\n");
            }
            if (StringUtils.isNotBlank((String) health.get("examResult")))
            {
                sb.append("· 体检：").append(abbreviate((String) health.get("examResult"), 60)).append("\n");
            }
            if (StringUtils.isNotBlank((String) care.get("reminder")))
            {
                sb.append("· 提醒：").append(care.get("reminder")).append("\n");
            }
            if (StringUtils.isNotBlank((String) health.get("feedPlan")))
            {
                sb.append("\n喂养方案\n").append(abbreviate((String) health.get("feedPlan"), 200)).append("\n");
            }
            if (StringUtils.isNotBlank((String) health.get("carePoints")))
            {
                sb.append("\n注意\n").append(abbreviate((String) health.get("carePoints"), 200)).append("\n");
            }
        }

        Map<?, ?> preference = care.get("preference") instanceof Map ? (Map<?, ?>) care.get("preference") : null;
        if (preference != null && StringUtils.isNotBlank((String) preference.get("taboo")))
        {
            sb.append("\n忌口：").append(abbreviate((String) preference.get("taboo"), 80)).append("\n");
        }

        Object services = care.get("services");
        if (services instanceof List && !((List<?>) services).isEmpty())
        {
            sb.append("\n最近服务\n");
            int count = 0;
            for (Object item : (List<?>) services)
            {
                if (count++ >= 3)
                {
                    break;
                }
                Map<?, ?> one = (Map<?, ?>) item;
                sb.append("· ").append(value(one.get("itemName"), "服务"))
                  .append(" ").append(value(one.get("appointTime"), ""))
                  .append(" ").append(status(APPOINTMENT_STATUS, one.get("status"))).append("\n");
            }
        }

        sb.append("\n疫苗和驱虫的具体时间以门店记录为准；出现精神差、呕吐、腹泻等情况先联系医生。");
        answer.content = sb.toString();
        answer.actions.add(action("link", "看我的宠物", "/shop/mypet"));
        answer.actions.add(action("link", "预约到店", "/shop/appointment"));
        return answer;
    }

    /** 后台经营问数：复用看板口径，不做自由 text-to-SQL */
    private Answer metricAnswer(String message, boolean allowed, Answer answer)
    {
        if (!allowed)
        {
            answer.content = "经营数据只有管理员和店长能看。想了解门店情况，可以联系门店负责人。";
            return answer;
        }
        int days = daysFrom(message);
        Map<String, Object> data = petDashboardService.all(days);
        answer.tools.add("dashboard.all");

        Map<?, ?> overview = asMap(data.get("overview"));
        Map<?, ?> growth = asMap(overview.get("growth"));
        Map<?, ?> range = asMap(data.get("range"));

        List<Map<String, Object>> items = new ArrayList<>();
        items.add(statItem("营业额", "¥" + moneyText(overview.get("revenue")), growthText(growth.get("revenue"))));
        items.add(statItem("订单", num(overview.get("orders")) + " 笔", growthText(growth.get("orders"))));
        items.add(statItem("预约", num(overview.get("appointments")) + " 单", ""));
        items.add(statItem("咨询", num(overview.get("consults")) + " 条", ""));
        items.add(statItem("客单价", "¥" + moneyText(overview.get("avgOrderAmount")), ""));
        items.add(statItem("取消率", moneyText(overview.get("cancelRate")) + "%", "含订单与预约"));

        StringBuilder sb = new StringBuilder();
        sb.append("近 ").append(days).append(" 天（")
          .append(value(range.get("start"), "")).append(" ~ ").append(value(range.get("end"), ""))
          .append("）：\n");
        sb.append("\n· 营业额 ¥").append(moneyText(overview.get("revenue")))
          .append("，").append(growthText(growth.get("revenue")));
        sb.append("\n· 订单 ").append(num(overview.get("orders"))).append(" 笔，")
          .append(growthText(growth.get("orders")));
        sb.append("\n· 预约 ").append(num(overview.get("appointments"))).append(" 单");
        sb.append("\n· 咨询 ").append(num(overview.get("consults"))).append(" 条");
        sb.append("\n· 客单价 ¥").append(moneyText(overview.get("avgOrderAmount")))
          .append("，取消率 ").append(moneyText(overview.get("cancelRate"))).append("%");
        sb.append("\n\n当前累积待处理：预约 ")
          .append(num(overview.get("pendingAppointments"))).append(" 单、咨询 ")
          .append(num(overview.get("pendingConsults"))).append(" 条（不限本区间）。");
        sb.append("\n\n想拆到具体门店、商品或客户，可以在看板里筛，也可以继续问我。");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", "近 " + days + " 天经营概况");
        payload.put("range", value(range.get("start"), "") + " ~ " + value(range.get("end"), ""));
        payload.put("items", items);
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("type", "stat");
        block.put("data", payload);
        answer.blocks.add(block);

        answer.content = sb.toString();
        answer.actions.add(action("link", "打开数据看板", "/admin/dashboard"));
        return answer;
    }

    private static Map<String, Object> statItem(String label, String value, String hint)
    {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("label", label);
        item.put("value", value);
        item.put("hint", hint == null ? "" : hint);
        return item;
    }

    private static Map<?, ?> asMap(Object value)
    {
        return value instanceof Map ? (Map<?, ?>) value : new LinkedHashMap<>();
    }

    private static long num(Object value)
    {
        return value instanceof Number ? ((Number) value).longValue() : 0L;
    }

    private static String moneyText(Object value)
    {
        if (!(value instanceof Number))
        {
            return "0";
        }
        double v = ((Number) value).doubleValue();
        if (Math.abs(v - Math.rint(v)) < 0.005)
        {
            return String.valueOf((long) Math.rint(v));
        }
        return String.format("%.2f", v);
    }

    private static String growthText(Object value)
    {
        if (!(value instanceof Number))
        {
            return "";
        }
        double v = ((Number) value).doubleValue();
        if (Math.abs(v) < 0.05)
        {
            return "与上期持平";
        }
        return (v > 0 ? "环比 +" : "环比 ") + String.format("%.1f", v) + "%";
    }

    private static int daysFrom(String message)
    {
        if (SceneRouter.contains(message, "今天", "今日", "当天"))
        {
            return 1;
        }
        if (SceneRouter.contains(message, "90天", "三个月", "一个季度", "季度"))
        {
            return 90;
        }
        if (SceneRouter.contains(message, "30天", "本月", "这个月", "近一个月", "一个月"))
        {
            return 30;
        }
        return 7;
    }

    private static Long toLong(Object value)
    {
        if (value instanceof Number)
        {
            return ((Number) value).longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(value));
        }
        catch (Exception e)
        {
            return null;
        }
    }

    private Answer knowledgeAnswer(String message, String species, Answer answer)
    {
        List<PetKnowledge> hits = knowledgeService.search(message,
                species == null ? knowledgeService.detectSpecies(message) : species, properties.getKnowledgeLimit());
        answer.tools.add("knowledge.search");
        if (hits.isEmpty())
        {
            // 知识库未命中时不再模板拒答：给模型一个中性的事实底座，
            // 由大模型基于通用养宠知识回答（模型不可用时这句本身就是兜底文案）。
            answer.content = "知识库里暂无现成资料，可基于通用养宠知识回答；如涉及具体病症请以兽医诊断为准。";
            answer.actions.add(action("handoff", "还有问题，转人工"));
            return answer;
        }
        knowledgeService.hit(hits);

        PetKnowledge top = hits.get(0);
        StringBuilder sb = new StringBuilder();
        sb.append(top.getTitle()).append("\n\n").append(abbreviate(top.getContent(), 420));
        answer.citations.add(citation(top));
        answer.blocks.add(knowledgeBlock(top));

        if (hits.size() > 1 && !"high".equals(top.getSeverity()))
        {
            PetKnowledge second = hits.get(1);
            sb.append("\n\n补充：").append(second.getTitle()).append("——")
              .append(abbreviate(second.getContent(), 160));
            answer.citations.add(citation(second));
        }
        if (knowledgeService.hasEmergency(hits))
        {
            sb.append("\n\n如果出现上述危险信号，请立即就医，不要在家观察。");
            answer.handoff = true;
            answer.actions.add(action("handoff", "转人工客服"));
        }
        else
        {
            answer.actions.add(action("handoff", "还有问题，转人工"));
        }
        answer.content = sb.toString();
        return answer;
    }

    private Answer draftAnswer(String bizId, Answer answer)
    {
        if (StringUtils.isBlank(bizId))
        {
            answer.content = "缺少咨询单号，无法起草回复。";
            return answer;
        }
        PetConsult consult;
        try
        {
            consult = petConsultService.selectPetConsultByConsultId(Long.parseLong(bizId.trim()));
        }
        catch (Exception e)
        {
            answer.content = "没有找到这条咨询。";
            return answer;
        }
        if (consult == null)
        {
            answer.content = "没有找到这条咨询。";
            return answer;
        }
        answer.tools.add("consult.draft");
        List<PetKnowledge> hits = knowledgeService.search(consult.getQuestion(),
                knowledgeService.detectSpecies(consult.getQuestion()), 2);
        if (!hits.isEmpty())
        {
            knowledgeService.hit(hits);
            for (PetKnowledge one : hits)
            {
                answer.citations.add(citation(one));
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("您好，关于您咨询的「").append(abbreviate(consult.getQuestion(), 60)).append("」：\n\n");
        if (hits.isEmpty())
        {
            sb.append("这个问题需要先和门店确认一下，我已经把情况记录下来了，稍后给您准确答复。\n");
        }
        else
        {
            sb.append(abbreviate(hits.get(0).getContent(), 320)).append("\n");
        }
        if (consult.getUserId() != null)
        {
            List<Map<String, Object>> orders = tools.myOrders(consult.getUserId(), 1);
            if (!orders.isEmpty())
            {
                Map<String, Object> order = orders.get(0);
                sb.append("\n我这边看到您最近的订单 ").append(order.get("orderNo"))
                  .append("，当前是「").append(status(ORDER_STATUS, order.get("status"))).append("」。\n");
            }
        }
        sb.append("\n如果还有不清楚的地方，直接回复这条消息就行，我们会继续跟进。");
        answer.content = sb.toString();
        return answer;
    }

    /* ---------- 模型生成 ---------- */

    /**
     * 模型主导回答：门店业务数据（订单/宠物/商品/知识命中）作为已核实事实注入，
     * 大模型组织语言作答。事实覆盖不到的部分（通用养护知识）允许模型用自己的
     * 知识回答；涉及门店价格、库存、订单状态必须以事实为准，没有就如实说明。
     * 失败返回 null，由调用方降级为本地模板。
     */
    private String generate(String scene, String message, Answer answer, Consumer<String> onDelta)
    {
        try
        {
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(LlmClient.msg("system", systemPrompt(scene)));
            StringBuilder user = new StringBuilder();
            user.append("用户问题：").append(message).append("\n\n");
            user.append("【门店已核实数据】\n")
                .append(StringUtils.isBlank(answer.content) ? "（与该问题无关或暂无数据）" : answer.content)
                .append("\n\n");
            user.append("回答要求：\n")
                .append("1. 数据里有和问题相关的内容（订单、宠物、商品、价格、库存）时，严格按数据回答，不得改动数字、单号和状态。\n")
                .append("2. 数据与问题无关或为空时，直接忽略数据，用你自己的养宠知识正常回答用户，不要说“没有相关记录”这类推脱的话。\n")
                .append("3. 涉及本店没有给出的价格、库存、到货时间，不要编造，建议用户查看商品页或咨询门店。\n")
                .append("4. 用简体中文，口语化，不用 Markdown 标题、表格和加粗，控制在 350 字以内。");
            messages.add(LlmClient.msg("user", user.toString()));
            try
            {
                return llmClient.chat(messages, onDelta);
            }
            catch (Exception first)
            {
                // 免费档限流（402 FREE_LIMIT，每 IP 30 秒 1 次）：按上游提示的秒数等待后重试一次
                String reason = String.valueOf(first.getMessage());
                long waitMs = 3000L;
                Matcher retryHint = Pattern.compile("[Rr]etry after (\\d+)").matcher(reason);
                if (retryHint.find())
                {
                    waitMs = Math.min(60, Long.parseLong(retryHint.group(1)) + 2) * 1000L;
                }
                else if (reason.contains("FREE_LIMIT"))
                {
                    waitMs = 32000L;
                }
                log.warn("模型生成失败，等待 {} 秒后重试一次：{}", waitMs / 1000, guard.mask(reason));
                Thread.sleep(waitMs);
                return llmClient.chat(messages, onDelta);
            }
        }
        catch (Exception e)
        {
            log.warn("模型重试后仍失败，降级为本地模板：{}", guard.mask(e.getMessage()));
            return null;
        }
    }

    private String systemPrompt(String scene)
    {
        String sceneText;
        if ("detail".equals(scene))
        {
            sceneText = "用户正在看一只宠物的详情页，可能关心健康、性格、养护成本和是否适合自己。";
        }
        else if ("order".equals(scene))
        {
            sceneText = "用户在商城下单/售后流程中，既可能问订单状态，也可能顺带问商品和养护问题。";
        }
        else if ("match".equals(scene))
        {
            sceneText = "用户正在选宠，需要结合居住空间、经验、陪伴时间和预算给建议。";
        }
        else if ("admin_consult".equals(scene))
        {
            sceneText = "你在帮门店客服起草回复，语气要专业、克制、可执行。";
        }
        else if ("admin".equals(scene))
        {
            sceneText = "你在帮门店管理者解读经营数据。";
        }
        else
        {
            sceneText = "用户在咨询养宠或平台规则问题。";
        }
        return "你是重庆「宠物之家」的线上助手，服务三家直营门店，底层由大模型驱动。\n"
                + sceneText + "\n"
                + "规则：\n"
                + "1. 门店数据（订单、宠物档案、商品价格库存）只依据给出的事实回答，没有依据就说没有，不要编造。\n"
                + "2. 通用养宠知识（喂养、训练、行为、日常护理）可以正常回答，必要时给出可执行的建议。\n"
                + "3. 不做疾病诊断、不承诺治愈；涉及用药和急症一律建议咨询兽医或立即就医。\n"
                + "4. 用简体中文，口语化，不用 Markdown 标题、表格和加粗。\n";
    }

    /* ---------- 持久化 ---------- */

    private void persist(ChatRequest req, String message, Answer answer, Long userId, String userName, int latency)
    {
        try
        {
            PetAiConversation conv;
            if (req.convId != null)
            {
                conv = conversationMapper.selectConversationById(req.convId);
            }
            else
            {
                conv = null;
            }
            if (conv == null)
            {
                conv = new PetAiConversation();
                conv.setConvNo("AI" + new SimpleDateFormat("yyyyMMddHHmmss").format(new Date())
                        + String.format("%03d", ThreadLocalRandom.current().nextInt(1000)));
                conv.setUserId(userId);
                conv.setUserName(userName);
                conv.setScene(StringUtils.isBlank(req.scene) ? "shop" : req.scene);
                conv.setBizId(req.bizId);
                conv.setTitle(abbreviate(message, 40));
                conv.setStatus("0");
                conversationMapper.insertConversation(conv);
            }
            answer.convId = conv.getConvId();

            PetAiMessage userMsg = new PetAiMessage();
            userMsg.setConvId(conv.getConvId());
            userMsg.setRole("user");
            userMsg.setContent(message);
            conversationMapper.insertMessage(userMsg);

            PetAiMessage aiMsg = new PetAiMessage();
            aiMsg.setConvId(conv.getConvId());
            aiMsg.setRole("assistant");
            aiMsg.setContent(answer.content);
            aiMsg.setBlocksJson(answer.blocks.isEmpty() ? null : JSON.writeValueAsString(answer.blocks));
            aiMsg.setCitationsJson(answer.citations.isEmpty() ? null : JSON.writeValueAsString(answer.citations));
            aiMsg.setActionsJson(answer.actions.isEmpty() ? null : JSON.writeValueAsString(answer.actions));
            aiMsg.setToolNames(String.join(",", answer.tools));
            aiMsg.setLatencyMs(latency);
            conversationMapper.insertMessage(aiMsg);
            answer.msgId = aiMsg.getMsgId();

            PetAiConversation update = new PetAiConversation();
            update.setConvId(conv.getConvId());
            update.setMessageCount((conv.getMessageCount() == null ? 0 : conv.getMessageCount()) + 2);
            update.setStatus(answer.handoff ? "1" : "0");
            conversationMapper.updateConversation(update);
        }
        catch (Exception e)
        {
            log.warn("AI 会话落库失败：{}", guard.mask(e.getMessage()));
        }
    }

    /* ---------- 小工具 ---------- */

    private static Map<String, Object> citation(PetKnowledge one)
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("knowledgeId", one.getKnowledgeId());
        m.put("title", one.getTitle());
        m.put("source", one.getSource());
        m.put("category", one.getCategory());
        return m;
    }

    private static Map<String, Object> knowledgeBlock(PetKnowledge one)
    {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("knowledgeId", one.getKnowledgeId());
        data.put("title", one.getTitle());
        data.put("content", abbreviate(one.getContent(), 300));
        data.put("severity", one.getSeverity());
        Map<String, Object> block = new LinkedHashMap<>();
        block.put("type", "knowledge");
        block.put("data", data);
        return block;
    }

    private static Map<String, Object> action(String type, String label)
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("label", label);
        return m;
    }

    private static Map<String, Object> action(String type, String label, String path)
    {
        Map<String, Object> m = action(type, label);
        m.put("path", path);
        return m;
    }

    /** 带业务参数的确认型动作：前端二次确认后才真正执行 */
    private static Map<String, Object> actionData(String type, String label, Map<String, Object> data)
    {
        Map<String, Object> m = action(type, label);
        m.put("data", data);
        return m;
    }

    private static String status(String[] labels, Object code)
    {
        if (code == null)
        {
            return "未知";
        }
        try
        {
            int index = Integer.parseInt(String.valueOf(code));
            return index >= 0 && index < labels.length ? labels[index] : "未知";
        }
        catch (Exception e)
        {
            return "未知";
        }
    }

    private static String orderHint(Map<String, Object> order)
    {
        String status = String.valueOf(order.get("status"));
        String pay = String.valueOf(order.get("payStatus"));
        if ("3".equals(status))
        {
            return "订单已取消，库存已释放；如果之前付过款，退款会原路退回。";
        }
        if ("0".equals(status) && "0".equals(pay))
        {
            return "还没支付，可以在订单页完成支付；不想买了直接取消即可。";
        }
        if ("1".equals(status))
        {
            return "已支付，等待门店发货或到店自提。";
        }
        if ("2".equals(status))
        {
            return "已完成。如果商品有问题，已支付订单可以申请退款。";
        }
        return "可以在订单页查看完整明细。";
    }

    private static void appendList(StringBuilder sb, String prefix, Object value, int limit)
    {
        if (!(value instanceof List))
        {
            return;
        }
        List<?> list = (List<?>) value;
        if (list.isEmpty())
        {
            return;
        }
        sb.append(prefix);
        for (int i = 0; i < list.size() && i < limit; i++)
        {
            if (i > 0)
            {
                sb.append("；");
            }
            sb.append(list.get(i));
        }
        sb.append("\n");
    }

    private static String value(Object value, String fallback)
    {
        if (value == null)
        {
            return fallback;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? fallback : text;
    }

    private static String abbreviate(String text, int max)
    {
        if (text == null)
        {
            return "";
        }
        String value = text.replace("\r", "");
        return value.length() <= max ? value : value.substring(0, max) + "…";
    }

    private static String cleanMarkdown(String text)
    {
        if (text == null)
        {
            return "";
        }
        return text.replaceAll("\\*\\*", "").replaceAll("(?m)^#{1,6}\\s*", "").trim();
    }

    private static String catOf(int prefer)
    {
        switch (prefer)
        {
            case 1: return "cat";
            case 2: return "dog";
            case 3: return "rabbit";
            case 4: return "hamster";
            case 5: return "bird";
            case 6: return "fish";
            case 7: return "reptile";
            default: return null;
        }
    }

    private static String goodsKeyword(String message)
    {
        if (StringUtils.isBlank(message))
        {
            return null;
        }
        Matcher matcher = Pattern.compile("([\\u4e00-\\u9fa5]{2,8})(粮|罐头|零食|营养)").matcher(message);
        if (!matcher.find())
        {
            return null;
        }
        // "想咨询一些关于狗粮" 这类句子会把动词和量词带进来，去掉后再检索
        String word = matcher.group(0).replaceAll(
                "^(想买|要买|帮我买|帮我|给我|麻烦|请|想|要|买|来|[一二两三四五几]?[袋包盒罐]"
                        + "|咨询|问问|请问|想问|了解|关于|一些|介绍|看看|推荐)+", "");
        word = word.replaceAll("(关于|一些|咨询|什么|的)$", "");
        return StringUtils.isBlank(word) ? matcher.group(0) : word;
    }

    private static Long storeIdFrom(String message)
    {
        if (message != null && message.contains("高新"))
        {
            return 2L;
        }
        if (message != null && message.contains("江北"))
        {
            return 3L;
        }
        return 1L;
    }

    private static String dateFrom(String message)
    {
        LocalDate date = LocalDate.now();
        if (message != null && message.contains("明天"))
        {
            date = date.plusDays(1);
        }
        else if (message != null && message.contains("后天"))
        {
            date = date.plusDays(2);
        }
        return date.toString();
    }

    /** 保留给后续"最近 N 天"类问题使用 */
    @SuppressWarnings("unused")
    private static String daysAgo(int days)
    {
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.DAY_OF_MONTH, -days);
        return DATETIME.format(calendar.getTime());
    }
}
