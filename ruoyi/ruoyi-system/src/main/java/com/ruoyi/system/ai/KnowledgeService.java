package com.ruoyi.system.ai;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetKnowledge;
import com.ruoyi.system.mapper.PetKnowledgeMapper;

/**
 * 知识检索：先走 MySQL ngram 全文索引，不够再按关键词兜底。
 * 知识量级在千条以内时，这比引入向量库更划算；接口保持独立，后续可换成向量召回。
 *
 * @author ruoyi
 */
@Service
public class KnowledgeService
{
    /** 低于这个分数的全文命中视为噪声 */
    private static final double MIN_SCORE = 0.8D;

    private static final String[] STOP_WORDS = {
            "怎么办", "怎么", "如何", "可以", "能不能", "是否", "请问", "一下", "我家", "我的",
            "这个", "那个", "什么", "多久", "为什么", "吗", "呢", "啊", "呀", "吧", "了", "的",
            "夏天", "冬天", "今天", "明天", "后天", "最近", "现在", "需要", "应该", "能用", "用吗"
    };

    /** 这些 2-gram 太泛，命中它们不代表主题相关 */
    private static final Set<String> STOP_GRAMS = new LinkedHashSet<>(java.util.Arrays.asList(
            "新买", "刚买", "买的", "什么", "怎么", "可以", "需要", "多久", "才能", "一个", "这个", "那个", "放在"
    ));
    private static final String[][] SPECIES_HINTS = {
            { "猫", "猫科" }, { "狗", "犬科" }, { "犬", "犬科" }, { "兔", "兔科" },
            { "仓鼠", "鼠科" }, { "鼠", "鼠科" }, { "鹦鹉", "鹦鹉科" }, { "鸟", "鹦鹉科" },
            { "鱼", "观赏鱼科" }, { "龟", "爬行科" }, { "蜥蜴", "爬行科" }, { "守宫", "爬行科" }
    };

    @Autowired
    private PetKnowledgeMapper knowledgeMapper;

    /** 从问题里推断科系，用于收窄检索范围 */
    public String detectSpecies(String question)
    {
        if (StringUtils.isBlank(question))
        {
            return null;
        }
        for (String[] pair : SPECIES_HINTS)
        {
            if (question.contains(pair[0]))
            {
                return pair[1];
            }
        }
        return null;
    }

    /**
     * 检索知识。
     *
     * @param question 用户原话
     * @param species  科系（可为空）
     * @param limit    最多返回条数
     */
    public List<PetKnowledge> search(String question, String species, int limit)
    {
        List<PetKnowledge> result = new ArrayList<>();
        if (StringUtils.isBlank(question) || limit <= 0)
        {
            return result;
        }
        String cleaned = clean(question);
        Map<Long, PetKnowledge> merged = new LinkedHashMap<>();

        for (PetKnowledge one : knowledgeMapper.searchByFulltext(cleaned, species, limit + 2))
        {
            if (one.getScore() != null && one.getScore() >= MIN_SCORE)
            {
                merged.put(one.getKnowledgeId(), one);
            }
        }

        if (merged.size() < 2)
        {
            Set<String> terms = new LinkedHashSet<>();
            terms.add(cleaned);
            for (String piece : split(cleaned))
            {
                terms.add(piece);
                if (piece.length() > 6)
                {
                    terms.add(piece.substring(0, 6));
                    terms.add(piece.substring(piece.length() - 6));
                }
            }
            int tried = 0;
            for (String term : terms)
            {
                if (StringUtils.isBlank(term) || term.length() < 2)
                {
                    continue;
                }
                for (PetKnowledge one : knowledgeMapper.searchByLike(term, species, limit))
                {
                    if (!merged.containsKey(one.getKnowledgeId()))
                    {
                        one.setScore(1.0D);
                        merged.put(one.getKnowledgeId(), one);
                    }
                }
                if (++tried >= 5 || merged.size() >= limit)
                {
                    break;
                }
            }
        }

        // 相关性二次过滤：只命中"猫/狗"这类物种名不算相关，必须命中问题里的实义词片段。
        // 宁可回答"没查到"，也不要把「仓鼠湿尾」答到「仓鼠能不能用浴沙」上。
        Set<String> grams = coreGrams(question);
        if (grams.isEmpty())
        {
            for (PetKnowledge one : merged.values())
            {
                result.add(one);
                if (result.size() >= limit)
                {
                    break;
                }
            }
            return result;
        }

        List<PetKnowledge> candidates = new ArrayList<>();
        Map<Long, Integer> overlapMap = new LinkedHashMap<>();
        for (PetKnowledge one : merged.values())
        {
            int overlap = overlap(one, grams);
            if (overlap > 0)
            {
                candidates.add(one);
                overlapMap.put(one.getKnowledgeId(), overlap);
            }
        }
        candidates.sort((a, b) -> {
            int diff = overlapMap.getOrDefault(b.getKnowledgeId(), 0) - overlapMap.getOrDefault(a.getKnowledgeId(), 0);
            if (diff != 0)
            {
                return diff;
            }
            double sa = a.getScore() == null ? 0D : a.getScore();
            double sb = b.getScore() == null ? 0D : b.getScore();
            return Double.compare(sb, sa);
        });
        for (PetKnowledge one : candidates)
        {
            result.add(one);
            if (result.size() >= limit)
            {
                break;
            }
        }
        return result;
    }

    /** 问题的实义 2-gram，剔除物种名与停用词 */
    private Set<String> coreGrams(String question)
    {
        String text = clean(question);
        for (String[] pair : SPECIES_HINTS)
        {
            // 单字物种词容易被"鱼缸/猫砂/狗粮"误伤，只剔除多字词
            if (pair[0].length() >= 2)
            {
                text = text.replace(pair[0], " ");
            }
        }
        text = text.replaceAll("[^\\u4e00-\\u9fa5a-zA-Z0-9]", "");
        Set<String> grams = new LinkedHashSet<>();
        for (int i = 0; i + 1 < text.length(); i++)
        {
            grams.add(text.substring(i, i + 2));
        }
        return grams;
    }

    /** 候选知识在标题/关键词/典型问法上与问题的重合度 */
    private int overlap(PetKnowledge one, Set<String> grams)
    {
        String hay = (one.getTitle() == null ? "" : one.getTitle())
                + " " + (one.getKeywords() == null ? "" : one.getKeywords())
                + " " + (one.getQuestion() == null ? "" : one.getQuestion());
        String cleaned = hay.replaceAll("[^\\u4e00-\\u9fa5a-zA-Z0-9]", "");
        int hit = 0;
        for (String gram : grams)
        {
            if (!STOP_GRAMS.contains(gram) && cleaned.contains(gram))
            {
                hit++;
            }
        }
        return hit;
    }

    /** 命中计数（异步性不重要，失败不影响回答） */
    public void hit(List<PetKnowledge> list)
    {
        if (list == null)
        {
            return;
        }
        for (PetKnowledge one : list)
        {
            try
            {
                knowledgeMapper.incrementHit(one.getKnowledgeId());
            }
            catch (Exception ignore)
            {
            }
        }
    }

    /** 把知识拼成提示词上下文，带编号便于模型引用 */
    public String context(List<PetKnowledge> list)
    {
        if (list == null || list.isEmpty())
        {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        int index = 1;
        for (PetKnowledge one : list)
        {
            sb.append("【资料").append(index++).append("】")
              .append(one.getTitle())
              .append(one.getContent() == null ? "" : "\n" + one.getContent())
              .append("\n\n");
        }
        return sb.toString().trim();
    }

    public boolean hasEmergency(List<PetKnowledge> list)
    {
        if (list == null)
        {
            return false;
        }
        for (PetKnowledge one : list)
        {
            if ("1".equals(one.getEmergency()))
            {
                return true;
            }
        }
        return false;
    }

    private String clean(String text)
    {
        String value = text == null ? "" : text.trim();
        value = value.replaceAll("[\\p{Punct}，。！？；：“”‘’（）【】《》、…—]", " ");
        value = value.replaceAll("\\s+", " ").trim();
        for (String stop : STOP_WORDS)
        {
            value = value.replace(stop, " ");
        }
        return value.replaceAll("\\s+", " ").trim();
    }

    private List<String> split(String text)
    {
        List<String> list = new ArrayList<>();
        if (StringUtils.isBlank(text))
        {
            return list;
        }
        for (String piece : text.split("\\s+"))
        {
            String value = piece.trim();
            if (value.length() >= 2 && value.length() <= 12)
            {
                list.add(value);
            }
        }
        return list;
    }
}
