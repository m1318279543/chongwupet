package com.ruoyi.web.controller.system;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetKnowledge;
import com.ruoyi.system.mapper.PetAiConversationMapper;
import com.ruoyi.system.mapper.PetKnowledgeMapper;

/**
 * AI 知识库管理
 *
 * 知识条目是助手回答的唯一事实来源，这里提供增删改查与运营概览：
 * 命中排行告诉运营"哪些有用"，缺口列表告诉运营"还缺什么"。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/knowledge")
public class PetKnowledgeController extends BaseController
{
    @Autowired
    private PetKnowledgeMapper knowledgeMapper;

    @Autowired
    private PetAiConversationMapper conversationMapper;

    /** 知识列表 */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetKnowledge query)
    {
        startPage();
        return getDataTable(knowledgeMapper.selectPetKnowledgeList(query));
    }

    /** 知识详情 */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:query')")
    @GetMapping("/{knowledgeId}")
    public AjaxResult getInfo(@PathVariable("knowledgeId") Long knowledgeId)
    {
        PetKnowledge one = knowledgeMapper.selectPetKnowledgeById(knowledgeId);
        return one == null ? AjaxResult.error("知识条目不存在") : success(one);
    }

    /** 新增知识 */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:add')")
    @Log(title = "AI知识库", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetKnowledge knowledge)
    {
        String invalid = validate(knowledge);
        if (invalid != null)
        {
            return AjaxResult.error(invalid);
        }
        knowledge.setCreateBy(getUsername());
        if (StringUtils.isBlank(knowledge.getStatus()))
        {
            knowledge.setStatus("0");
        }
        if (knowledge.getSort() == null)
        {
            knowledge.setSort(90);
        }
        return toAjax(knowledgeMapper.insertPetKnowledge(knowledge));
    }

    /** 修改知识 */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:edit')")
    @Log(title = "AI知识库", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetKnowledge knowledge)
    {
        if (knowledge == null || knowledge.getKnowledgeId() == null)
        {
            return AjaxResult.error("缺少知识ID");
        }
        String invalid = validate(knowledge);
        if (invalid != null)
        {
            return AjaxResult.error(invalid);
        }
        knowledge.setUpdateBy(getUsername());
        return toAjax(knowledgeMapper.updatePetKnowledge(knowledge));
    }

    /** 删除知识（逻辑删除） */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:remove')")
    @Log(title = "AI知识库", businessType = BusinessType.DELETE)
    @DeleteMapping("/{knowledgeIds}")
    public AjaxResult remove(@PathVariable("knowledgeIds") Long[] knowledgeIds)
    {
        return toAjax(knowledgeMapper.deletePetKnowledgeByIds(knowledgeIds));
    }

    /** 运营概览：总量、分布、命中排行、知识缺口、反馈 */
    @PreAuthorize("@ss.hasPermi('pet:knowledge:list')")
    @GetMapping("/stat")
    public AjaxResult stat()
    {
        List<PetKnowledge> all = knowledgeMapper.selectPetKnowledgeList(new PetKnowledge());
        int enabled = 0;
        int emergency = 0;
        int hits = 0;
        Map<String, Integer> categoryCount = new LinkedHashMap<>();
        for (PetKnowledge one : all)
        {
            if ("0".equals(one.getStatus()))
            {
                enabled++;
            }
            if ("1".equals(one.getEmergency()))
            {
                emergency++;
            }
            if (one.getHitCount() != null)
            {
                hits += one.getHitCount();
            }
            String category = StringUtils.isBlank(one.getCategory()) ? "未分类" : one.getCategory();
            categoryCount.merge(category, 1, Integer::sum);
        }

        List<PetKnowledge> sorted = new ArrayList<>(all);
        sorted.sort(Comparator.comparingInt((PetKnowledge one) -> one.getHitCount() == null ? 0 : one.getHitCount()).reversed());
        List<Map<String, Object>> top = new ArrayList<>();
        for (int i = 0; i < sorted.size() && i < 6; i++)
        {
            PetKnowledge one = sorted.get(i);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("knowledgeId", one.getKnowledgeId());
            item.put("title", one.getTitle());
            item.put("category", one.getCategory());
            item.put("hitCount", one.getHitCount() == null ? 0 : one.getHitCount());
            top.add(item);
        }

        List<Map<String, Object>> categories = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : categoryCount.entrySet())
        {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", entry.getKey());
            item.put("count", entry.getValue());
            categories.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("total", all.size());
        data.put("enabled", enabled);
        data.put("emergency", emergency);
        data.put("hits", hits);
        data.put("categories", categories);
        data.put("top", top);
        data.put("gaps", conversationMapper.selectKnowledgeGaps(10));
        data.put("feedback", conversationMapper.selectFeedbackStat());
        return success(data);
    }

    private static String validate(PetKnowledge knowledge)
    {
        if (knowledge == null)
        {
            return "参数不能为空";
        }
        if (StringUtils.isBlank(knowledge.getTitle()))
        {
            return "标题不能为空";
        }
        if (StringUtils.isBlank(knowledge.getContent()))
        {
            return "内容不能为空，助手只会依据这里的内容回答";
        }
        if (knowledge.getTitle().length() > 120)
        {
            return "标题不能超过 120 字";
        }
        if (knowledge.getContent().length() > 4000)
        {
            return "内容不能超过 4000 字";
        }
        return null;
    }
}
