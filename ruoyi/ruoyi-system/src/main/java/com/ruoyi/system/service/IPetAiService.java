package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;

/**
 * 全站 AI 智能服务
 *
 * 复用 application.yml 中 llm.* 配置（OpenAI 兼容 /chat/completions，默认 Pollinations 免费免密钥通道），
 * 对外提供三类能力：
 *   1. chat()             —— 商城智能助手多轮对话（带宠物库 / 用户订单预约上下文）
 *   2. parseMatchDemand() —— 自然语言选宠需求解析成问卷答案（AI 自动填答）
 *   3. businessInsight()  —— 后台经营数据 AI 洞察（自动生成中文分析结论）
 *
 * 所有能力在模型不可用时都会降级为本地规则结果，保证功能不空白。
 *
 * @author ruoyi
 */
public interface IPetAiService
{
    /**
     * 智能助手对话
     *
     * @param messages 对话消息（role/content），最后一条为本次用户输入
     * @param scene    场景：shop 商城通用 / detail 宠物详情 / order 订单咨询
     * @param petId    详情场景下的宠物 ID
     */
    Map<String, Object> chat(List<Map<String, String>> messages, String scene, Long petId);

    /**
     * 流式对话：模型增量内容通过 onDelta 回调实时推送；模型不可用时降级为本地规则回复一次性推送
     *
     * @return 内容来源（ai=大模型 / rule=本地规则降级）
     */
    String chatStream(List<Map<String, String>> messages, String scene, Long petId,
                      java.util.function.Consumer<String> onDelta);

    /**
     * 自然语言选宠需求解析（如「我住小户型，上班忙，预算 3000，想养只猫」）
     */
    Map<String, Object> parseMatchDemand(String text);

    /**
     * 经营数据洞察
     *
     * @param days 统计天数
     */
    Map<String, Object> businessInsight(int days);

    /**
     * 直接调用模型（供其他业务复用），失败返回 null
     */
    String rawChat(List<Map<String, String>> messages, double temperature);

    /**
     * 模型通道是否可用于调用
     */
    boolean isAvailable();
}
