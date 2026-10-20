package com.ruoyi.system.service.impl;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.alibaba.fastjson2.JSON;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetCategory;
import com.ruoyi.system.domain.PetMatchRecord;
import com.ruoyi.system.mapper.PetCategoryMapper;
import com.ruoyi.system.mapper.PetMatchMapper;
import com.ruoyi.system.service.IPetMatchService;

/**
 * AI 宠物智能匹配实现
 *
 * 混合推荐策略（纯后端、无外部 AI 服务）：
 *   1. 规则引擎：把问卷映射成"空间 / 运动 / 照料时间 / 经验 / 噪音容忍 / 预算"六维画像，
 *      与宠物特征逐维比对扣分，得到内容匹配度 content(0-100)。
 *   2. 协同过滤：user-based CF，用收藏(3)、预约(5)、点赞(2)做隐式反馈，
 *      计算当前用户与其他用户的余弦相似度，把相似用户喜欢过、当前用户还没看过的宠物推上来。
 *   3. 人气加权：全站交互热度 + like_count，避免冷启动时结果过于随机。
 *
 * 无历史行为（游客 / 新用户）时自动降级为 规则 84% + 人气 16%。
 *
 * @author ruoyi
 */
@Service
public class PetMatchServiceImpl implements IPetMatchService
{
    private static final int TOP_N = 8;

    private static final Logger log = LoggerFactory.getLogger(PetMatchServiceImpl.class);

    @Autowired
    private PetMatchMapper matchMapper;

    @Autowired
    private PetCategoryMapper categoryMapper;

    /** 品类ID -> 名称缓存（用于无匹配原因提示） */
    private volatile Map<Integer, String> categoryNames;

    private String preferName(int categoryId)
    {
        if (categoryId <= 0)
        {
            return null;
        }
        if (categoryNames == null)
        {
            Map<Integer, String> m = new HashMap<>();
            try
            {
                for (PetCategory c : categoryMapper.selectPetCategoryList(new PetCategory()))
                {
                    if (c.getCategoryId() != null)
                    {
                        m.put(c.getCategoryId().intValue(), c.getCategoryName());
                    }
                }
                categoryNames = m;
            }
            catch (Exception e)
            {
                log.warn("读取宠物品类失败：{}", e.getMessage());
                return null;
            }
        }
        return categoryNames.get(categoryId);
    }

    @Override
    public Map<String, Object> recommend(Map<String, Object> answers)
    {
        Map<String, Object> safeAnswers = answers == null ? new HashMap<>() : answers;
        Profile pf = Profile.of(safeAnswers);

        List<Map<String, Object>> pets = matchMapper.selectTraitPets();
        Map<Long, Double> cfScore = cfScores(pf.userId);

        // 人气原始分 = 交互信号权重 + 点赞数 * 0.5
        Map<Long, Double> popSignal = new HashMap<>();
        for (Map<String, Object> row : matchMapper.selectInteractionSignals())
        {
            Long pid = toLong(row.get("petId"));
            if (pid == null)
            {
                continue;
            }
            popSignal.merge(pid, num(row, "weight"), Double::sum);
        }
        Map<Long, Double> popRaw = new HashMap<>();
        double maxPop = 1D;
        for (Map<String, Object> p : pets)
        {
            Long pid = toLong(p.get("petId"));
            double v = popSignal.getOrDefault(pid, 0D) + num(p, "likeCount") * 0.5D;
            popRaw.put(pid, v);
            maxPop = Math.max(maxPop, v);
        }

        List<Map<String, Object>> scored = new ArrayList<>();
        // 未匹配诊断：按「类型 -> 有小孩 -> 预算」顺序归因，互斥计数（每只宠物只记第一个命中的拦截条件）
        int byPrefer = 0;
        int byKids = 0;
        int byBudget = 0;
        // 通过类型/小孩筛选后的最低价，用于给"预算不够"的提示
        double cheapestCandidate = Double.MAX_VALUE;
        for (Map<String, Object> p : pets)
        {
            Long petId = toLong(p.get("petId"));
            int categoryId = (int) num(p, "categoryId");
            double price = num(p, "price");
            int kidFriendly = (int) num(p, "kidFriendly");

            // —— 硬性条件：偏好类型 / 有小孩 / 购宠预算 ——
            if (pf.prefer > 0 && categoryId != pf.prefer)
            {
                byPrefer++;
                continue;
            }
            if (pf.kids && kidFriendly == 0)
            {
                byKids++;
                continue;
            }
            if (price > 0)
            {
                cheapestCandidate = Math.min(cheapestCandidate, price);
            }
            if (price > pf.budget)
            {
                byBudget++;
                continue;
            }

            int spaceNeed = (int) num(p, "spaceNeed");
            int activityNeed = (int) num(p, "activityNeed");
            int careLevel = (int) num(p, "careLevel");
            int expLevel = (int) num(p, "expLevel");
            int noiseLevel = (int) num(p, "noiseLevel");
            double monthlyCost = num(p, "monthlyCost");
            String traits = str(p, "traits");

            // —— 规则引擎：逐维扣分 ——
            double content = 100D;
            if (spaceNeed > pf.space)
            {
                content -= (spaceNeed - pf.space) >= 2 ? 38D : 18D;
            }
            content -= Math.abs(activityNeed - pf.activity) * 11D;
            if (careLevel > pf.time)
            {
                content -= (careLevel - pf.time) >= 2 ? 34D : 16D;
            }
            if (expLevel > pf.experience)
            {
                content -= (expLevel - pf.experience) >= 2 ? 28D : 14D;
            }
            if (noiseLevel > pf.noiseTol)
            {
                content -= (noiseLevel - pf.noiseTol) >= 2 ? 26D : 12D;
            }
            if (monthlyCost > pf.monthly)
            {
                content -= monthlyCost > pf.monthly * 1.5D ? 20D : 9D;
            }
            if ("clingy".equals(pf.companion) && traits.contains("独立"))
            {
                content -= 8D;
            }
            if ("independent".equals(pf.companion) && traits.contains("粘人"))
            {
                content -= 6D;
            }
            content = clamp(content, 5D, 100D);

            // —— 混合加权 ——
            double cf = cfScore.getOrDefault(petId, 0D);
            double pop = popRaw.getOrDefault(petId, 0D) / maxPop * 100D;
            double finalScore = pf.hasHistory
                    ? content * 0.72D + cf * 0.16D + pop * 0.12D
                    : content * 0.84D + pop * 0.16D;
            finalScore = round(finalScore, 1);

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("petId", petId);
            item.put("petName", p.get("petName"));
            item.put("breed", p.get("breed"));
            item.put("image", p.get("image"));
            item.put("age", p.get("age"));
            item.put("gender", p.get("gender"));
            item.put("price", price);
            item.put("description", p.get("description"));
            item.put("categoryId", categoryId);
            item.put("categoryName", p.get("categoryName"));
            item.put("groupName", p.get("groupName"));
            item.put("monthlyCost", monthlyCost);
            item.put("traits", splitTags(traits));
            item.put("score", finalScore);
            item.put("contentScore", round(content, 1));
            item.put("cfScore", round(cf, 1));
            item.put("popularityScore", round(pop, 1));
            item.put("matchLevel", matchLevel(finalScore));
            item.put("reasons", reasons(pf, spaceNeed, activityNeed, careLevel, expLevel, noiseLevel,
                    kidFriendly, monthlyCost, price, traits, cf, pop));
            item.put("cautions", cautions(pf, spaceNeed, careLevel, expLevel, noiseLevel, monthlyCost, price));
            item.put("breakdown", breakdown(pf, spaceNeed, activityNeed, careLevel, expLevel, noiseLevel, monthlyCost, price, maxPop, popSignal, petId));
            scored.add(item);
        }

        scored.sort(Comparator.comparingDouble((Map<String, Object> m) -> num(m, "score")).reversed());
        if (scored.size() > TOP_N)
        {
            scored = new ArrayList<>(scored.subList(0, TOP_N));
        }
        for (int i = 0; i < scored.size(); i++)
        {
            scored.get(i).put("rank", i + 1);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("profile", pf.toMap());
        result.put("algorithm", "规则引擎 + 协同过滤 + 人气加权");
        result.put("hasHistory", pf.hasHistory);
        result.put("candidateCount", pets.size());
        result.put("matchedCount", scored.size());
        result.put("recommendations", scored);
        // 无匹配时给出归因诊断，前端据此提示用户；有匹配时为 null
        Map<String, Object> diagnosis = null;
        if (scored.isEmpty())
        {
            diagnosis = buildDiagnosis(pf, pets, byPrefer, byKids, byBudget, cheapestCandidate);
            result.put("diagnosis", diagnosis);
        }
        result.put("summary", buildSummary(scored, pf, diagnosis));
        result.put("generatedAt", new Date());
        result.put("recordId", saveRecord(safeAnswers, pf, scored, diagnosis, pets.size()));
        return result;
    }

    /**
     * 无匹配诊断：按「类型 -> 有小孩 -> 预算」的漏斗定位真正的卡点。
     *
     * 注意不能只看淘汰数量多少：类型过滤掉 75 只、只剩 21 只猫都超预算时，
     * 根因是预算而不是类型（类型本身是有货的），所以用"过滤后是否还有候选"判断。
     */
    private Map<String, Object> buildDiagnosis(Profile pf, List<Map<String, Object>> pets,
            int byPrefer, int byKids, int byBudget, double cheapestCandidate)
    {
        int afterPrefer = pets.size() - byPrefer;
        int afterKids = afterPrefer - byKids;
        String rootCause;
        if (pets.isEmpty())
        {
            rootCause = "empty";
        }
        else if (afterPrefer <= 0)
        {
            rootCause = "prefer";
        }
        else if (afterKids <= 0)
        {
            rootCause = "kids";
        }
        else
        {
            rootCause = "budget";
        }

        Map<String, Object> d = new LinkedHashMap<>();
        d.put("rootCause", rootCause);
        d.put("total", pets.size());
        d.put("byPrefer", byPrefer);
        d.put("byKids", byKids);
        d.put("byBudget", byBudget);
        d.put("budget", pf.budget);
        d.put("prefer", pf.prefer);
        d.put("lowestPrice", cheapestCandidate == Double.MAX_VALUE ? null : cheapestCandidate);

        String preferredName = preferName(pf.prefer);
        List<String> tips = new ArrayList<>();
        String summary;
        if ("empty".equals(rootCause))
        {
            summary = "当前宠物库暂时没有在售个体，可以稍后再试。";
            tips.add("当前没有在售宠物，请稍后再试或联系客服");
        }
        else if ("prefer".equals(rootCause))
        {
            String name = preferredName == null ? "所选类型" : "「" + preferredName + "」";
            summary = "你偏好的" + name + "目前没有在售个体，所以没有匹配结果。";
            tips.add(name + "当前没有在售个体，把宠物类型改为「不限」即可看到其他推荐");
        }
        else if ("kids".equals(rootCause))
        {
            summary = "在有小孩的前提下，当前在售个体都不适合儿童家庭，所以没有匹配结果。";
            tips.add("在售个体里没有标注「适合儿童」的" + (preferredName == null ? "宠物" : preferredName)
                    + "，建议先咨询客服了解性情温和的个体");
        }
        else
        {
            int low = cheapestCandidate == Double.MAX_VALUE ? 0 : (int) Math.ceil(cheapestCandidate);
            summary = "在售最低价约 ¥" + low + "，高于你的购宠预算 ¥" + (int) pf.budget
                    + (byPrefer > 0 ? "（你偏好的类型里没有更便宜的选择）" : "") + "。";
            tips.add("符合你其他条件的宠物最低价约 ¥" + low + "，比你的购宠预算 ¥" + (int) pf.budget
                    + " 高 ¥" + Math.max(0, low - (int) pf.budget) + "，可适当上调预算");
            if (byPrefer > 0)
            {
                tips.add("如不愿加预算，可把宠物类型改为「不限」，兔、仓鼠等品类价格更低");
            }
            tips.add("也可以咨询客服，看看近期是否有同类但价格更低的个体");
        }
        tips.add("本次测评已记录，我们会参考大家的需求调整在售品类");
        d.put("tips", tips);
        d.put("summary", summary);
        return d;
    }

    /**
     * 保存问卷记录（失败不影响推荐结果）
     *
     * 注意：无论是否匹配到宠物都要落库 —— 无匹配的问卷同样是有效需求数据，
     * 后台可以据此看到"用户想要什么但店里没有"，用于选品与定价。
     */
    private Long saveRecord(Map<String, Object> answers, Profile pf, List<Map<String, Object>> scored,
            Map<String, Object> diagnosis, int candidateCount)
    {
        try
        {
            PetMatchRecord record = new PetMatchRecord();
            record.setUserId(pf.userId);
            record.setUserName(pf.userName);
            record.setAnswers(JSON.toJSONString(answers));
            record.setAlgorithm(pf.hasHistory ? "规则引擎+协同过滤+人气" : "规则引擎+人气");

            if (scored.isEmpty())
            {
                // 无匹配：保留 userId / 问卷 / 诊断，首推字段留空
                record.setMatchStatus("1");
                record.setTopPetName("");
                record.setResultPets("无匹配");
                record.setDiagnosis(diagnosis == null ? null : JSON.toJSONString(diagnosis));
                record.setResultDetail("[]");
                matchMapper.insertPetMatchRecord(record);
                return record.getRecordId();
            }

            Map<String, Object> top = scored.get(0);
            record.setMatchStatus("0");
            record.setTopPetId(toLong(top.get("petId")));
            record.setTopPetName(str(top, "petName"));
            record.setTopScore(num(top, "score"));
            StringBuilder names = new StringBuilder();
            List<Map<String, Object>> brief = new ArrayList<>();
            for (int i = 0; i < scored.size() && i < 5; i++)
            {
                Map<String, Object> s = scored.get(i);
                if (i > 0)
                {
                    names.append(" / ");
                }
                names.append(str(s, "petName")).append("(").append(num(s, "score")).append(")");
                Map<String, Object> b = new LinkedHashMap<>();
                b.put("petName", s.get("petName"));
                b.put("score", s.get("score"));
                b.put("price", s.get("price"));
                b.put("reasons", s.get("reasons"));
                brief.add(b);
            }
            record.setResultPets(names.toString());
            record.setResultDetail(JSON.toJSONString(brief));
            matchMapper.insertPetMatchRecord(record);
            return record.getRecordId();
        }
        catch (Exception e)
        {
            log.warn("保存智能匹配记录失败：{}", e.getMessage());
            return null;
        }
    }

    private String buildSummary(List<Map<String, Object>> scored, Profile pf, Map<String, Object> diagnosis)
    {
        if (scored.isEmpty())
        {
            // 与诊断共用同一段文案，避免"总结说预算、建议说类型"的口径矛盾
            Object s = diagnosis == null ? null : diagnosis.get("summary");
            return s == null ? "按当前条件暂时没有合适的宠物，建议放宽预算或类型偏好后重试。" : String.valueOf(s);
        }
        Map<String, Object> top = scored.get(0);
        StringBuilder sb = new StringBuilder();
        sb.append("为你找到 ").append(scored.size()).append(" 只匹配宠物，最匹配的是「")
          .append(str(top, "petName")).append("」，匹配度 ").append(num(top, "score")).append("%");
        if (num(top, "score") >= 80)
        {
            sb.append("，和你的生活方式非常契合。");
        }
        else
        {
            sb.append("，可作为优先考虑对象。");
        }
        return sb.toString();
    }

    // ==================== 推荐理由 ====================

    private List<String> reasons(Profile pf, int spaceNeed, int activityNeed, int careLevel, int expLevel,
            int noiseLevel, int kidFriendly, double monthlyCost, double price, String traits, double cf, double pop)
    {
        List<String> list = new ArrayList<>();
        if (spaceNeed == 1 && pf.space <= 2)
        {
            list.add("公寓 / 小户型友好");
        }
        else if (spaceNeed == 2 && pf.space == 2)
        {
            list.add("普通住宅即可饲养");
        }
        if (careLevel == 1)
        {
            list.add("低维护，忙碌也能照顾");
        }
        if (expLevel == 1 && pf.experience == 1)
        {
            list.add("新手友好，容易上手");
        }
        else if (expLevel == 3 && pf.experience == 3)
        {
            list.add("有挑战性，适合有经验的你");
        }
        if (noiseLevel == 1)
        {
            list.add("安静少叫，不扰邻里");
        }
        if (activityNeed >= 3 && pf.activity >= 3)
        {
            list.add("精力充沛，能陪你一起运动");
        }
        if (activityNeed <= 1 && pf.activity <= 1)
        {
            list.add("不需要遛弯，宅家也自在");
        }
        if (kidFriendly == 1 && pf.kids)
        {
            list.add("性情温和，适合有孩子的家庭");
        }
        if ("clingy".equals(pf.companion) && traits.contains("粘人"))
        {
            list.add("性格粘人，适合陪伴");
        }
        if ("independent".equals(pf.companion) && traits.contains("独立"))
        {
            list.add("独立省心，不会过度依赖");
        }
        if (monthlyCost <= pf.monthly && pf.monthly < 90000)
        {
            list.add("月均花费约 ¥" + (int) monthlyCost + "，在养护预算内");
        }
        if (price <= pf.budget * 0.6D && pf.budget < 90000)
        {
            list.add("价格在你的预算内，性价比高");
        }
        if (cf >= 50D)
        {
            list.add("和你兴趣相似的用户也喜欢它");
        }
        if (pop >= 60D)
        {
            list.add("近期人气很高，咨询量靠前");
        }
        return list.size() > 5 ? new ArrayList<>(list.subList(0, 5)) : list;
    }

    private List<String> cautions(Profile pf, int spaceNeed, int careLevel, int expLevel, int noiseLevel,
            double monthlyCost, double price)
    {
        List<String> list = new ArrayList<>();
        if (spaceNeed > pf.space)
        {
            list.add("需要更大的活动空间，小户型可能有点挤");
        }
        if (careLevel > pf.time)
        {
            list.add("每天需要较多陪伴与打理时间");
        }
        if (expLevel > pf.experience + 1)
        {
            list.add("有一定饲养门槛，建议先积累经验");
        }
        if (noiseLevel > pf.noiseTol)
        {
            list.add("叫声较大，需要考虑邻里感受");
        }
        if (monthlyCost > pf.monthly)
        {
            list.add("月均花费约 ¥" + (int) monthlyCost + "，高于你的养护预算");
        }
        if (price > pf.budget * 0.8D && pf.budget < 90000)
        {
            list.add("价格接近预算上限");
        }
        return list;
    }

    // ==================== 维度匹配度（前端进度条 / 雷达） ====================

    private Map<String, Object> breakdown(Profile pf, int spaceNeed, int activityNeed, int careLevel,
            int expLevel, int noiseLevel, double monthlyCost, double price, double maxPop,
            Map<Long, Double> popSignal, Long petId)
    {
        Map<String, Object> bd = new LinkedHashMap<>();
        bd.put("空间", clamp(100D - Math.max(0, spaceNeed - pf.space) * 45D, 10D, 100D));
        bd.put("运动", clamp(100D - Math.abs(activityNeed - pf.activity) * 40D, 10D, 100D));
        bd.put("照料", clamp(100D - Math.max(0, careLevel - pf.time) * 45D, 10D, 100D));
        bd.put("经验", clamp(100D - Math.max(0, expLevel - pf.experience) * 45D, 10D, 100D));
        bd.put("安静", clamp(100D - Math.max(0, noiseLevel - pf.noiseTol) * 45D, 10D, 100D));
        double budgetFit;
        if (price > pf.budget)
        {
            budgetFit = 20D;
        }
        else if (monthlyCost > pf.monthly)
        {
            budgetFit = 65D;
        }
        else if (price <= pf.budget * 0.6D)
        {
            budgetFit = 100D;
        }
        else
        {
            budgetFit = 88D;
        }
        bd.put("预算", budgetFit);
        bd.put("人气", round(popSignal.getOrDefault(petId, 0D) / Math.max(1D, maxPop) * 100D, 0));
        return bd;
    }

    // ==================== 协同过滤 ====================

    /** user-based CF：返回 petId -> 0..100 的协同得分 */
    private Map<Long, Double> cfScores(Long userId)
    {
        Map<Long, Double> result = new HashMap<>();
        if (userId == null)
        {
            return result;
        }
        Map<Long, Map<Long, Double>> userPets = new HashMap<>();
        for (Map<String, Object> row : matchMapper.selectInteractionSignals())
        {
            Long uid = toLong(row.get("userId"));
            Long pid = toLong(row.get("petId"));
            if (uid == null || pid == null)
            {
                continue;
            }
            userPets.computeIfAbsent(uid, k -> new HashMap<>()).merge(pid, num(row, "weight"), Double::sum);
        }
        Map<Long, Double> mine = userPets.get(userId);
        if (mine == null || mine.isEmpty())
        {
            return result;
        }
        double mineNorm = Math.sqrt(mine.values().stream().mapToDouble(v -> v * v).sum());
        if (mineNorm <= 0)
        {
            return result;
        }
        Set<Long> seen = new HashSet<>(mine.keySet());
        Map<Long, Double> raw = new HashMap<>();
        for (Map.Entry<Long, Map<Long, Double>> entry : userPets.entrySet())
        {
            if (entry.getKey().equals(userId))
            {
                continue;
            }
            Map<Long, Double> other = entry.getValue();
            double dot = 0D;
            for (Map.Entry<Long, Double> e : mine.entrySet())
            {
                Double w = other.get(e.getKey());
                if (w != null)
                {
                    dot += e.getValue() * w;
                }
            }
            if (dot <= 0)
            {
                continue;
            }
            double otherNorm = Math.sqrt(other.values().stream().mapToDouble(v -> v * v).sum());
            if (otherNorm <= 0)
            {
                continue;
            }
            double sim = dot / (mineNorm * otherNorm);
            if (sim < 0.05D)
            {
                continue;
            }
            for (Map.Entry<Long, Double> e : other.entrySet())
            {
                if (!seen.contains(e.getKey()))
                {
                    raw.merge(e.getKey(), sim * e.getValue(), Double::sum);
                }
            }
        }
        double max = raw.values().stream().mapToDouble(Double::doubleValue).max().orElse(0D);
        if (max <= 0)
        {
            return result;
        }
        for (Map.Entry<Long, Double> e : raw.entrySet())
        {
            result.put(e.getKey(), e.getValue() / max * 100D);
        }
        return result;
    }

    // ==================== 记录查询 ====================

    @Override
    public List<PetMatchRecord> selectRecordList(PetMatchRecord query)
    {
        return matchMapper.selectPetMatchRecordList(query);
    }

    @Override
    public PetMatchRecord selectRecordById(Long recordId)
    {
        return matchMapper.selectPetMatchRecordById(recordId);
    }

    @Override
    public int deleteRecordByIds(Long[] recordIds)
    {
        return matchMapper.deletePetMatchRecordByIds(recordIds);
    }

    @Override
    public int cleanRecords()
    {
        return matchMapper.deletePetMatchRecordAll();
    }

    @Override
    public int countRecords()
    {
        return matchMapper.countPetMatchRecord();
    }

    @Override
    public Map<String, Object> stat()
    {
        Map<String, Object> raw = matchMapper.selectMatchStat();
        Map<String, Object> out = new LinkedHashMap<>();
        long total = raw == null ? 0L : (long) toDouble(raw.get("total"));
        long empty = raw == null ? 0L : (long) toDouble(raw.get("emptyCount"));
        long today = raw == null ? 0L : (long) toDouble(raw.get("todayCount"));
        out.put("total", total);
        out.put("matched", total - empty);
        out.put("empty", empty);
        out.put("today", today);
        out.put("emptyRate", total == 0 ? 0D : round(empty * 100D / total, 1));
        return out;
    }

    private static double toDouble(Object v)
    {
        if (v == null)
        {
            return 0D;
        }
        if (v instanceof Number)
        {
            return ((Number) v).doubleValue();
        }
        try
        {
            return Double.parseDouble(v.toString());
        }
        catch (Exception e)
        {
            return 0D;
        }
    }

    // ==================== 工具方法 ====================

    private static String matchLevel(double score)
    {
        if (score >= 88D)
        {
            return "非常匹配";
        }
        if (score >= 78D)
        {
            return "高度匹配";
        }
        if (score >= 65D)
        {
            return "比较合适";
        }
        if (score >= 50D)
        {
            return "可以考虑";
        }
        return "匹配一般";
    }

    private static List<String> splitTags(String traits)
    {
        List<String> list = new ArrayList<>();
        if (traits == null || traits.isEmpty())
        {
            return list;
        }
        for (String s : traits.split(","))
        {
            if (!s.trim().isEmpty())
            {
                list.add(s.trim());
            }
        }
        return list;
    }

    private static double clamp(double v, double min, double max)
    {
        return Math.max(min, Math.min(max, v));
    }

    private static double round(double v, int scale)
    {
        double factor = Math.pow(10, scale);
        return Math.round(v * factor) / factor;
    }

    private static double num(Map<String, Object> map, String key)
    {
        if (map == null)
        {
            return 0D;
        }
        Object v = map.get(key);
        if (v == null)
        {
            return 0D;
        }
        if (v instanceof Number)
        {
            return ((Number) v).doubleValue();
        }
        try
        {
            return Double.parseDouble(v.toString());
        }
        catch (Exception e)
        {
            return 0D;
        }
    }

    private static String str(Map<String, Object> map, String key)
    {
        Object v = map == null ? null : map.get(key);
        return v == null ? "" : v.toString();
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

    /** 问卷答案 -> 六维用户画像 */
    private static class Profile
    {
        int space;        // 空间容量 1小 2中 3大
        int activity;     // 运动倾向 1低 2中 3高
        int experience;   // 经验 1新手 2一般 3资深
        int time;         // 每日陪伴 1<1h 2 1-3h 3>3h
        int noiseTol;     // 噪音容忍 1低 2中 3高
        double budget;    // 购宠预算上限
        double monthly;   // 月均养护预算上限
        boolean kids;
        int prefer;       // 0=不限
        String companion;
        Long userId;
        String userName;
        boolean hasHistory;

        static Profile of(Map<String, Object> a)
        {
            Profile p = new Profile();
            String home = text(a, "home");
            p.space = "small".equals(home) ? 1 : ("house".equals(home) ? 3 : 2);

            String act = text(a, "activity");
            p.activity = "low".equals(act) ? 1 : ("high".equals(act) ? 3 : 2);

            String exp = text(a, "experience");
            p.experience = "none".equals(exp) ? 1 : ("pro".equals(exp) ? 3 : 2);

            String time = text(a, "time");
            p.time = "lt1".equals(time) ? 1 : ("gt3".equals(time) ? 3 : 2);

            String noise = text(a, "noise");
            p.noiseTol = "low".equals(noise) ? 1 : ("high".equals(noise) ? 3 : 2);

            p.budget = number(a, "budget", 100000D);
            p.monthly = number(a, "monthly", 100000D);
            if (p.budget <= 0)
            {
                p.budget = 100000D;
            }
            if (p.monthly <= 0)
            {
                p.monthly = 100000D;
            }
            p.kids = "yes".equals(text(a, "kids"));

            String prefer = text(a, "prefer");
            if (prefer.matches("\\d+"))
            {
                p.prefer = Integer.parseInt(prefer);
            }
            p.companion = text(a, "companion");

            try
            {
                p.userId = SecurityUtils.getUserId();
                p.userName = SecurityUtils.getUsername();
            }
            catch (Exception e)
            {
                p.userId = null;
                p.userName = "游客";
            }
            p.hasHistory = p.userId != null;
            return p;
        }

        Map<String, Object> toMap()
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("space", space);
            m.put("activity", activity);
            m.put("experience", experience);
            m.put("time", time);
            m.put("noiseTol", noiseTol);
            m.put("budget", budget);
            m.put("monthly", monthly);
            m.put("kids", kids);
            m.put("prefer", prefer);
            m.put("companion", companion);
            m.put("userName", userName);
            return m;
        }

        private static String text(Map<String, Object> a, String key)
        {
            Object v = a == null ? null : a.get(key);
            return v == null ? "" : v.toString();
        }

        private static double number(Map<String, Object> a, String key, double def)
        {
            Object v = a == null ? null : a.get(key);
            if (v == null)
            {
                return def;
            }
            if (v instanceof Number)
            {
                return ((Number) v).doubleValue();
            }
            try
            {
                return Double.parseDouble(v.toString());
            }
            catch (Exception e)
            {
                return def;
            }
        }
    }
}
