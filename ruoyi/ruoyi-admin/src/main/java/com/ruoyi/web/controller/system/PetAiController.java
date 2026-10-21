package com.ruoyi.web.controller.system;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.service.IPetAiService;

/**
 * 全站 AI 智能能力接口
 *
 *   POST /pet/ai/chat      商城智能助手对话（游客可用，带 IP 限流）
 *   POST /pet/ai/parse     自然语言选宠需求 -> 问卷答案（游客可用）
 *   GET  /pet/ai/insight   后台经营数据 AI 洞察（需看板权限）
 *   GET  /pet/ai/status    模型通道状态（运维自检）
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/ai")
public class PetAiController
{
    @Autowired
    private IPetAiService petAiService;

    /** 每 IP 每分钟最多请求数（免费模型端点限流友好） */
    private static final int LIMIT_PER_MINUTE = 20;
    private static final Map<String, long[]> HITS = new ConcurrentHashMap<>();

    private static final ObjectMapper SSE_JSON = new ObjectMapper();
    /** 流式对话线程池（单实例内共享，避免 SSE 阻塞容器线程） */
    private static final ExecutorService STREAM_POOL = Executors.newFixedThreadPool(4, r -> {
        Thread t = new Thread(r, "pet-ai-stream");
        t.setDaemon(true);
        return t;
    });

    @PostMapping("/chat")
    public AjaxResult chat(@RequestBody Map<String, Object> body, HttpServletRequest request)
    {
        if (limited(request))
        {
            return AjaxResult.error("提问太频繁啦，休息一下再问吧～");
        }
        List<Map<String, String>> messages = toMessages(body == null ? null : body.get("messages"));
        String scene = body == null ? "shop" : String.valueOf(body.getOrDefault("scene", "shop"));
        Long petId = toLong(body == null ? null : body.get("petId"));
        return AjaxResult.success(petAiService.chat(messages, scene, petId));
    }

    /**
     * 流式对话（SSE）：POST /pet/ai/stream
     * 事件格式：
     *   data: {"delta":"增量文本"}
     *   data: {"done":true,"source":"ai|rule","final":"清洗后的全文"}
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@RequestBody Map<String, Object> body, HttpServletRequest request)
    {
        SseEmitter emitter = new SseEmitter(90_000L);
        if (limited(request))
        {
            try
            {
                emitter.send(SseEmitter.event().data(SSE_JSON.writeValueAsString(
                        Map.of("done", true, "source", "error", "final", "提问太频繁啦，休息一下再问吧～"))));
                emitter.complete();
            }
            catch (Exception ignored)
            {
            }
            return emitter;
        }
        List<Map<String, String>> messages = toMessages(body == null ? null : body.get("messages"));
        String scene = body == null ? "shop" : String.valueOf(body.getOrDefault("scene", "shop"));
        Long petId = toLong(body == null ? null : body.get("petId"));

        // 先发一个注释事件：立即把响应头刷给浏览器，前端可马上进入"思考中"状态
        try
        {
            emitter.send(SseEmitter.event().comment("start"));
        }
        catch (Exception ignored)
        {
        }

        STREAM_POOL.execute(() -> {
            StringBuilder full = new StringBuilder();
            String source;
            try
            {
                source = petAiService.chatStream(messages, scene, petId, delta -> {
                    synchronized (full)
                    {
                        full.append(delta);
                    }
                    try
                    {
                        emitter.send(SseEmitter.event().data(SSE_JSON.writeValueAsString(Map.of("delta", delta))));
                    }
                    catch (Exception ignored)
                    {
                    }
                });
            }
            catch (Exception e)
            {
                source = "rule";
                try
                {
                    emitter.send(SseEmitter.event().data(SSE_JSON.writeValueAsString(Map.of(
                            "done", true, "source", "error",
                            "final", "网络有点不稳定，AI 助手暂时没响应，请稍后再试。"))));
                }
                catch (Exception ignored)
                {
                }
                emitter.complete();
                return;
            }
            try
            {
                String finalText = full.toString().replaceAll("\\*{1,2}", "").replaceAll("^#+\\s*", "").trim();
                emitter.send(SseEmitter.event().data(SSE_JSON.writeValueAsString(
                        Map.of("done", true, "source", source, "final", finalText))));
                emitter.complete();
            }
            catch (Exception ignored)
            {
            }
        });
        return emitter;
    }

    @PostMapping("/parse")
    public AjaxResult parse(@RequestBody Map<String, Object> body, HttpServletRequest request)
    {
        if (limited(request))
        {
            return AjaxResult.error("请求太频繁啦，稍后再试～");
        }
        String text = body == null || body.get("text") == null ? "" : body.get("text").toString();
        if (StringUtils.isBlank(text))
        {
            return AjaxResult.error("请先描述一下你的养宠需求");
        }
        return AjaxResult.success(petAiService.parseMatchDemand(text));
    }

    @PreAuthorize("@ss.hasPermi('pet:dashboard:view')")
    @GetMapping("/insight")
    public AjaxResult insight(@RequestParam(value = "days", defaultValue = "7") int days)
    {
        return AjaxResult.success(petAiService.businessInsight(days));
    }

    @GetMapping("/status")
    public AjaxResult status()
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("available", petAiService.isAvailable());
        m.put("provider", "OpenAI 兼容 /chat/completions");
        return AjaxResult.success(m);
    }

    private boolean limited(HttpServletRequest request)
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
        long now = System.currentTimeMillis();
        long[] slot = HITS.computeIfAbsent(ip == null ? "unknown" : ip, k -> new long[]{now, 0L});
        synchronized (slot)
        {
            if (now - slot[0] > 60_000L)
            {
                slot[0] = now;
                slot[1] = 0L;
            }
            slot[1]++;
            return slot[1] > LIMIT_PER_MINUTE;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> toMessages(Object raw)
    {
        List<Map<String, String>> list = new ArrayList<>();
        if (!(raw instanceof List))
        {
            return list;
        }
        for (Object o : (List<Object>) raw)
        {
            if (!(o instanceof Map))
            {
                continue;
            }
            Map<String, Object> m = (Map<String, Object>) o;
            Map<String, String> one = new LinkedHashMap<>();
            one.put("role", m.get("role") == null ? "user" : String.valueOf(m.get("role")));
            one.put("content", m.get("content") == null ? "" : String.valueOf(m.get("content")));
            if (StringUtils.isNotBlank(one.get("content")))
            {
                list.add(one);
            }
        }
        return list;
    }

    private static Long toLong(Object v)
    {
        if (v == null)
        {
            return null;
        }
        if (v instanceof Number)
        {
            return ((Number) v).longValue();
        }
        try
        {
            return Long.parseLong(v.toString());
        }
        catch (Exception e)
        {
            return null;
        }
    }
}
