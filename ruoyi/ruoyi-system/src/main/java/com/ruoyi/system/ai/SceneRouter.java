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
    private static final Pattern BUDGET = Pattern.compile("(\\d{2,6})\\s*(?:元|块|以内|左右|预算)");
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
        if ("order".equals(scene) || contains(text, "订单", "退款", "发货", "物流", "支付", "付款", "到货"))
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
        if ("match".equals(scene) || contains(text, "推荐", "适合", "选一只", "养什么", "第一只", "新手养",
                "想养", "养一只", "不掉毛", "掉毛", "好养", "粘人", "温顺"))
        {
            return INTENT_MATCH;
        }
        if (contains(text, "门店", "地址", "营业时间", "在哪"))
        {
            return INTENT_STORES;
        }
        if (contains(text, "粮", "猫粮", "狗粮", "吃什么", "喂多少", "换粮"))
        {
            return INTENT_GOODS;
        }
        return INTENT_KNOWLEDGE;
    }

    /** 从自然语言里抽匹配问卷的槽位；抽不到就用中性默认值 */
    public static Map<String, Object> parseAnswers(String message)
    {
        String text = message == null ? "" : message;
        Map<String, Object> answers = new LinkedHashMap<>();

        answers.put("home", contains(text, "小户型", "合租", "单间", "公寓") ? "small"
                : contains(text, "大房子", "别墅", "带院", "大平层") ? "house" : "apartment");
        answers.put("activity", contains(text, "宅", "不爱动", "懒") ? "low"
                : contains(text, "每天运动", "跑步", "健身", "户外") ? "high" : "mid");
        answers.put("experience", contains(text, "第一次", "新手", "没养过") ? "none"
                : contains(text, "养过", "有经验") ? "some"
                : contains(text, "多年", "老手", "专业") ? "pro" : "some");
        answers.put("time", contains(text, "加班", "没时间", "出差", "很忙") ? "lt1"
                : contains(text, "全职", "在家", "很多时间") ? "gt3" : "1to3");
        answers.put("noise", contains(text, "怕吵", "不能吵", "安静", "隔音") ? "low"
                : contains(text, "无所谓", "不介意", "吵一点") ? "high" : "mid");
        answers.put("kids", contains(text, "孩子", "宝宝", "小孩", "儿童") ? "yes" : "no");
        answers.put("companion", text.length() > 60 ? text.substring(0, 60) : text);

        Matcher budget = BUDGET.matcher(text);
        if (budget.find())
        {
            answers.put("budget", budget.group(1));
        }
        Matcher monthly = MONTHLY.matcher(text);
        if (monthly.find())
        {
            answers.put("monthly", monthly.group(1));
        }

        int prefer = prefer(text);
        answers.put("prefer", prefer > 0 ? String.valueOf(prefer) : "0");
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
