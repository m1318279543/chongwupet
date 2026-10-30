package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetAiConversation;
import com.ruoyi.system.domain.PetAiMessage;

/**
 * AI 会话 Mapper
 *
 * @author ruoyi
 */
public interface PetAiConversationMapper
{
    public int insertConversation(PetAiConversation conversation);

    public int updateConversation(PetAiConversation conversation);

    public PetAiConversation selectConversationById(Long convId);

    public PetAiConversation selectConversationByNo(@Param("convNo") String convNo);

    public List<PetAiConversation> selectRecentByUser(@Param("userId") Long userId, @Param("limit") int limit);

    public int insertMessage(PetAiMessage message);

    public List<PetAiMessage> selectMessagesByConvId(@Param("convId") Long convId);

    public int insertFeedback(@Param("convId") Long convId,
                              @Param("msgId") Long msgId,
                              @Param("userId") Long userId,
                              @Param("rating") String rating,
                              @Param("reason") String reason);

    /** 知识缺口：AI 回答"没查到"时对应的原始问题 */
    public List<java.util.Map<String, Object>> selectKnowledgeGaps(@Param("limit") int limit);

    /** 反馈统计：总数 / 有用 / 没用 */
    public java.util.Map<String, Object> selectFeedbackStat();

    /** 后台咨询记录列表（分页插件接管分页） */
    public List<PetAiConversation> selectAdminList(PetAiConversation query);

    /** 意图分类统计：intent -> total */
    public List<java.util.Map<String, Object>> selectIntentStats();

    /** 咨询总览：total / today / handoff */
    public java.util.Map<String, Object> selectOverview();
}
