package com.ruoyi.web.controller.system;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.ai.AiGuard;
import com.ruoyi.system.ai.AssistantService;
import com.ruoyi.system.domain.PetAiConversation;
import com.ruoyi.system.domain.PetAiMessage;
import com.ruoyi.system.domain.PetConsult;
import com.ruoyi.system.mapper.PetAiConversationMapper;
import com.ruoyi.system.service.IPetConsultService;

/**
 * AI 助手接口
 *
 *   POST /pet/assistant/chat        流式对话（游客可用，按 IP 限流）
 *   POST /pet/assistant/chat/sync   同步对话（调试与降级）
 *   GET  /pet/assistant/history/{id} 会话回放
 *   POST /pet/assistant/feedback    回答反馈
 *   POST /pet/assistant/consult/draft 后台客服起草
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/assistant")
public class PetAssistantController
{
    private static final Logger log = LoggerFactory.getLogger(PetAssistantController.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final ExecutorService POOL = Executors.newFixedThreadPool(4, r -> {
        Thread thread = new Thread(r, "pet-assistant");
        thread.setDaemon(true);
        return thread;
    });

    @Autowired
    private AssistantService assistantService;

    @Autowired
    private PetAiConversationMapper conversationMapper;

    @Autowired
    private IPetConsultService petConsultService;

    @Autowired
    private AiGuard guard;

    /** 流式对话 */
    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request)
    {
        SseEmitter emitter = new SseEmitter(120_000L);
        if (guard.limited(clientIp(request)))
        {
            send(emitter, "error", mapOf("message", "问得有点快，休息一下再试～"));
            emitter.complete();
            return emitter;
        }
        AssistantService.ChatRequest req = toRequest(body);
        req.canViewMetric = canViewMetric();
        Long userId = currentUserId();
        String userName = currentUserName();

        POOL.execute(() -> {
            try
            {
                AssistantService.Answer answer = assistantService.chat(req, userId, userName,
                        delta -> send(emitter, "delta", mapOf("text", delta)));
                send(emitter, "done", answer.toPayload());
                emitter.complete();
            }
            catch (Exception e)
            {
                log.warn("AI 对话失败：{}", guard.mask(e.getMessage()));
                send(emitter, "error", mapOf("message", "助手暂时不可用，请稍后再试，或直接联系客服。"));
                emitter.complete();
            }
        });
        return emitter;
    }

    /** 同步对话：方便联调，也可作为 SSE 不可用时的降级 */
    @PostMapping("/chat/sync")
    public AjaxResult chatSync(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request)
    {
        if (guard.limited(clientIp(request)))
        {
            return AjaxResult.error("问得有点快，休息一下再试～");
        }
        AssistantService.ChatRequest req = toRequest(body);
        req.canViewMetric = canViewMetric();
        AssistantService.Answer answer = assistantService.chat(req, currentUserId(), currentUserName(), null);
        return AjaxResult.success(answer.toPayload());
    }

    /** 会话回放（只能看自己的） */
    @GetMapping("/history/{convId}")
    public AjaxResult history(@PathVariable("convId") Long convId)
    {
        PetAiConversation conv = conversationMapper.selectConversationById(convId);
        if (conv == null)
        {
            return AjaxResult.error("会话不存在");
        }
        Long userId = currentUserId();
        if (conv.getUserId() != null && userId != null && !conv.getUserId().equals(userId))
        {
            return AjaxResult.error("没有权限查看该会话");
        }
        List<Map<String, Object>> messages = new ArrayList<>();
        for (PetAiMessage one : conversationMapper.selectMessagesByConvId(convId))
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("msgId", one.getMsgId());
            m.put("role", one.getRole());
            m.put("content", one.getContent());
            m.put("blocks", parse(one.getBlocksJson()));
            m.put("citations", parse(one.getCitationsJson()));
            m.put("actions", parse(one.getActionsJson()));
            m.put("createTime", one.getCreateTime());
            messages.add(m);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("convId", conv.getConvId());
        data.put("scene", conv.getScene());
        data.put("bizId", conv.getBizId());
        data.put("status", conv.getStatus());
        data.put("messages", messages);
        return AjaxResult.success(data);
    }

    /** 反馈 */
    @PostMapping("/feedback")
    public AjaxResult feedback(@RequestBody Map<String, Object> body)
    {
        if (body == null || body.get("msgId") == null)
        {
            return AjaxResult.error("缺少消息ID");
        }
        String rating = String.valueOf(body.getOrDefault("rating", "1"));
        if (!"0".equals(rating) && !"1".equals(rating))
        {
            return AjaxResult.error("评价参数不正确");
        }
        conversationMapper.insertFeedback(
                toLong(body.get("convId")),
                toLong(body.get("msgId")),
                currentUserId(),
                rating,
                body.get("reason") == null ? "" : String.valueOf(body.get("reason")));
        return AjaxResult.success();
    }

    /** 后台客服起草：返回草稿与引用，不落库、不自动发送 */
    @PreAuthorize("@ss.hasPermi('pet:consult:list')")
    @PostMapping("/consult/draft")
    public AjaxResult consultDraft(@RequestBody Map<String, Object> body)
    {
        Long consultId = toLong(body == null ? null : body.get("consultId"));
        if (consultId == null)
        {
            return AjaxResult.error("缺少咨询ID");
        }
        PetConsult consult = petConsultService.selectPetConsultByConsultId(consultId);
        if (consult == null)
        {
            return AjaxResult.error("咨询不存在");
        }
        AssistantService.ChatRequest req = new AssistantService.ChatRequest();
        req.scene = "admin_consult";
        req.bizId = String.valueOf(consultId);
        req.message = StringUtils.isBlank(consult.getQuestion()) ? "客户咨询" : consult.getQuestion();

        AssistantService.Answer answer = assistantService.chat(req, currentUserId(), currentUserName(), null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("draft", answer.content);
        data.put("citations", answer.citations);
        data.put("convId", answer.convId);
        return AjaxResult.success(data);
    }

    /* ---------- 内部 ---------- */

    private AssistantService.ChatRequest toRequest(Map<String, Object> body)
    {
        AssistantService.ChatRequest req = new AssistantService.ChatRequest();
        if (body == null)
        {
            return req;
        }
        req.convId = toLong(body.get("convId"));
        req.scene = body.get("scene") == null ? "shop" : String.valueOf(body.get("scene"));
        req.bizId = body.get("bizId") == null ? "" : String.valueOf(body.get("bizId"));
        req.message = body.get("message") == null ? "" : String.valueOf(body.get("message"));
        req.petId = toLong(body.get("petId"));
        req.orderNo = body.get("orderNo") == null ? null : String.valueOf(body.get("orderNo"));
        if (body.get("answers") instanceof Map)
        {
            @SuppressWarnings("unchecked")
            Map<String, Object> answers = (Map<String, Object>) body.get("answers");
            req.answers = answers;
        }
        return req;
    }

    private static void send(SseEmitter emitter, String event, Map<String, Object> data)
    {
        try
        {
            emitter.send(SseEmitter.event().name(event).data(JSON.writeValueAsString(data)));
        }
        catch (Exception ignore)
        {
        }
    }

    private static Map<String, Object> mapOf(String key, Object value)
    {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put(key, value);
        return map;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> parse(String json)
    {
        if (StringUtils.isBlank(json))
        {
            return new ArrayList<>();
        }
        try
        {
            return JSON.readValue(json, List.class);
        }
        catch (Exception e)
        {
            return new ArrayList<>();
        }
    }

    private static String clientIp(HttpServletRequest request)
    {
        String ip = request.getHeader("X-Forwarded-For");
        if (StringUtils.isBlank(ip))
        {
            ip = request.getRemoteAddr();
        }
        else
        {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private static Long currentUserId()
    {
        try
        {
            return SecurityUtils.getUserId();
        }
        catch (Exception e)
        {
            return null;
        }
    }

    /** 经营数据权限：必须在请求线程里判定，SSE 线程池里没有 SecurityContext */
    private static boolean canViewMetric()
    {
        try
        {
            return SecurityUtils.isAdmin() || SecurityUtils.hasRole("store_manager");
        }
        catch (Exception e)
        {
            return false;
        }
    }

    private static String currentUserName()
    {
        try
        {
            return SecurityUtils.getUsername();
        }
        catch (Exception e)
        {
            return "游客";
        }
    }

    private static Long toLong(Object value)
    {
        if (value == null)
        {
            return null;
        }
        if (value instanceof Number)
        {
            return ((Number) value).longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(value).trim());
        }
        catch (Exception e)
        {
            return null;
        }
    }
}
