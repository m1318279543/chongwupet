package com.ruoyi.system.ai;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.ruoyi.common.utils.StringUtils;

/**
 * 场景路由：先定"要查什么"，再交给模板或模型措辞。
 *
 * P0 不让模型自由规划工具，避免调错工具和越权；等评测集跑稳后再开放 function calling。
 *
 * @author ruoyi
 */
public class SceneRouter
{
    public static final String INTENT_PET = "pet_detail";
    public static final String INTENT_MATCH = "match";
    public static final String INTENT_ORDER_LIST = "order_list";
    public static final String INTENT_ORDER_DETAIL = "order_detail";
    public static final String INTENT_APPOINTMENT = "appointment";
    public static final String INTENT_SLOTS = "slots";
    public static final String INTENT_STORES = "stores";
    public static final String INTENT_GOODS = "goods";
    public static final String INTENT_KNOWLEDGE = "knowledge";
    public static final String INTENT_DRAFT = "draft";
    public static final String INTENT_MY_PETS = "my_pets";
    public static final String INTENT_PET_CARE = "pet_care";
    public static final String INTENT_METRIC = "metric";

    private static final Pattern ORDER_NO = Pattern.compile("ORD\\d{10,}", Pattern.CASE_INSENSITIVE);
    // 购宠预算要兼容两种说法：「3000 元 / 3000 以内」和「预算 3000」。
    // 原正则只认数字在前，导致"预算 3000"（快捷问句里就是这么写的）抽不出来。
    private static final Pattern BUDGET = Pattern.compile(
            "(?:预算|价位|不超过|最多|控制在)\\s*(\\d{2,6})|(\\d{2,6})\\s*(?:元|块|以内|左右)");
    private static final Pattern MONTHLY = Pattern.compile("月均.{0,8}?(\\d{2,6})");

    /**
     * 判断意图。
     *
     * @param scene   入口场景
     * @param message 用户原话
     * @param petId   详情页携带的宠物
     */
    public static String route(String scene, String message, Long petId)
    {
        String text = message == null ? "" : message;
        if ("admin_consult".equals(scene))
        {
            return INTENT_DRAFT;
        }
        // 后台经营问数：只要从后台进来就走指标口径，不再落到通用知识
        if ("admin".equals(scene))
        {
            return INTENT_METRIC;
        }
        Matcher order = ORDER_NO.matcher(text);
        if (order.find())
        {
            return INTENT_ORDER_DETAIL;
        }
        // 订单意图只看内容关键词：用户在订单页问"狗粮怎么选"也应走商品咨询，
        // 入口场景不再兜底（避免随便一句"你好"也弹订单卡片）
        if (contains(text, "订单", "退款", "发货", "物流", "支付", "付款", "到货", "结算"))
        {
            return INTENT_ORDER_LIST;
        }
        if (contains(text, "预约", "看宠", "看狗", "看猫", "改期", "到店时间",
                "帮我约", "约个时间", "约一下", "想约"))
        {
            if (contains(text, "时段", "几点", "什么时间", "有空") && contains(text, "今天", "明天", "后天"))
            {
                return INTENT_SLOTS;
            }
            return INTENT_APPOINTMENT;
        }
        // 养宠管家：先判断"我的宠物"清单，再判断某只宠物的档案问题
        if (contains(text, "我的宠物", "我养的", "我领养的", "我的宝贝", "我家有几只", "我的毛孩子"))
        {
            return INTENT_MY_PETS;
        }
        if ("mypet".equals(scene) && petId != null)
        {
            return INTENT_PET_CARE;
        }
        if (contains(text, "疫苗", "驱虫", "打针", "体检", "喂养方案", "怎么喂", "吃多少",
                "健康档案", "养护", "打疫苗", "该打"))
        {
            return INTENT_PET_CARE;
        }
        // 详情页优先回答"这只"的问题；只有明确想换一只时才转到选宠
        if ("detail".equals(scene) && petId != null)
        {
            if (contains(text, "推荐", "其他", "别的", "还有", "换一只", "更便宜"))
            {
                return INTENT_MATCH;
            }
            return INTENT_PET;
        }
        // 商品咨询先于选宠推荐："推荐狗粮"是商品问题，"推荐一只猫"才是选宠
        if (contains(text, "粮", "猫粮", "狗粮", "吃什么", "喂多少", "换粮"))
        {
            return INTENT_GOODS;
        }
        // 关键词要覆盖前端 QUICK 里的快捷问句，否则用户点完示例会掉进养宠知识：
        // 「小户型、第一次养，预算 3000」和「每天只能陪 1 小时」原先都不命中。
        if ("match".equals(scene) || contains(text, "推荐", "适合", "选一只", "养什么", "第一只", "新手养",
                "第一次养", "小户型", "合租", "只能陪", "每天陪",
                "想养", "养一只", "不掉毛", "掉毛", "好养", "粘人", "温顺"))
        {
            return INTENT_MATCH;
        }
        if (contains(text, "门店", "地址", "营业时间", "在哪"))
        {
            return INTENT_STORES;
        }
        // 订单页入口不再兜底成订单咨询：问什么答什么（订单词已在前面命中），
        // 否则用户随便说句"你好"也会弹一屏订单卡片
        return INTENT_KNOWLEDGE;
    }

    /**
     * 从自然语言里抽匹配问卷的槽位。
     *
     * 只放「用户确实说过」的槽位，不再塞中性默认值。原先对每个槽位都填 apartment / mid / some
     * 这类兜底，等于把"没说"当成"选了中档"，用户会看到一个自己从未表达过的匹配度。
     * 抽到的槽位不足时由调用方追问或引导去完整测评页补全。
     */
    public static Map<String, Object> parseAnswers(String message)
    {
        String text = message == null ? "" : message;
        Map<String, Object> answers = new LinkedHashMap<>();

        if (contains(text, "小户型", "合租", "单间", "公寓", "小点的", "小一点"))
        {
            answers.put("home", "small");
        }
        else if (contains(text, "大房子", "别墅", "带院", "大平层", "大点的", "大一点"))
        {
            answers.put("home", "house");
        }

        if (contains(text, "宅", "不爱动", "懒得动"))
        {
            answers.put("activity", "low");
        }
        else if (contains(text, "每天运动", "跑步", "健身", "户外", "爬山"))
        {
            answers.put("activity", "high");
        }

        // 顺序要紧：「多年」必须比「养过」先判。原实现 some 在前，"多年养过"被 some 抢走，
        // pro 分支永远不可达。
        if (contains(text, "第一次", "新手", "没养过", "没养过宠物"))
        {
            answers.put("experience", "none");
        }
        else if (contains(text, "多年", "老手", "专业", "资深"))
        {
            answers.put("experience", "pro");
        }
        else if (contains(text, "养过", "有经验"))
        {
            answers.put("experience", "some");
        }

        if (contains(text, "只能陪", "陪不了", "加班", "没时间", "出差", "很忙"))
        {
            answers.put("time", "lt1");
        }
        else if (contains(text, "全职", "在家", "很多时间", "时间充裕"))
        {
            answers.put("time", "gt3");
        }

        if (contains(text, "怕吵", "不能吵", "安静", "隔音"))
        {
            answers.put("noise", "low");
        }
        else if (contains(text, "无所谓", "不介意", "吵一点"))
        {
            answers.put("noise", "high");
        }

        // 否定形式要先判，否则"没有孩子"会因为含"孩子"被错判成有小孩
        if (contains(text, "没有孩子", "没孩子", "无孩", "一个人住", "独居"))
        {
            answers.put("kids", "no");
        }
        else if (contains(text, "孩子", "宝宝", "小孩", "儿童"))
        {
            answers.put("kids", "yes");
        }

        // 后端拿 traits.contains("粘人") / contains("独立") 做精确匹配，
        // 所以这里只能传这两个词；原先塞整句话永远匹配不上，这条规则等于没生效。
        if (contains(text, "粘人", "黏人"))
        {
            answers.put("companion", "clingy");
        }
        else if (contains(text, "独立", "省心", "不粘"))
        {
            answers.put("companion", "independent");
        }

        Matcher budget = BUDGET.matcher(text);
        if (budget.find())
        {
            // 两个分支各一个捕获组，取命中的那个
            String value = budget.group(1) != null ? budget.group(1) : budget.group(2);
            answers.put("budget", value);
        }
        Matcher monthly = MONTHLY.matcher(text);
        if (monthly.find())
        {
            answers.put("monthly", monthly.group(1));
        }

        int prefer = prefer(text);
        if (prefer > 0)
        {
            answers.put("prefer", String.valueOf(prefer));
        }
        return answers;
    }

    /** 品类偏好：与 pet_category 的 1-7 对应 */
    public static int prefer(String text)
    {
        if (text == null)
        {
            return 0;
        }
        if (text.contains("猫"))
        {
            return 1;
        }
        if (text.contains("狗") || text.contains("犬"))
        {
            return 2;
        }
        if (text.contains("兔"))
        {
            return 3;
        }
        if (text.contains("仓鼠") || text.contains("鼠"))
        {
            return 4;
        }
        if (text.contains("鹦鹉") || text.contains("鸟"))
        {
            return 5;
        }
        if (text.contains("鱼"))
        {
            return 6;
        }
        if (text.contains("龟") || text.contains("蜥蜴") || text.contains("守宫") || text.contains("爬"))
        {
            return 7;
        }
        return 0;
    }

    /** 从问题里找订单号 */
    public static String orderNo(String message)
    {
        if (StringUtils.isBlank(message))
        {
            return null;
        }
        Matcher matcher = ORDER_NO.matcher(message);
        return matcher.find() ? matcher.group().toUpperCase() : null;
    }

    public static boolean contains(String text, String... words)
    {
        if (text == null || words == null)
        {
            return false;
        }
        for (String word : words)
        {
            if (text.contains(word))
            {
                return true;
            }
        }
        return false;
    }
}
