package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetHealthIssue;

/**
 * 宠物常见健康问题 服务层
 *
 * @author ruoyi
 */
public interface IPetHealthIssueService
{
    public List<PetHealthIssue> selectPetHealthIssueList(PetHealthIssue petHealthIssue);

    /**
     * 前台获取常见问题：若仅传 categoryId，则自动按该分类的科系匹配知识库条目
     */
    public List<PetHealthIssue> selectPetHealthIssueFront(PetHealthIssue petHealthIssue);

    public PetHealthIssue selectPetHealthIssueByIssueId(Long issueId);

    public List<PetHealthIssue> selectPetHealthIssueByFamily(String family);

    public int insertPetHealthIssue(PetHealthIssue petHealthIssue);

    public int updatePetHealthIssue(PetHealthIssue petHealthIssue);

    public int deletePetHealthIssueByIssueIds(Long[] issueIds);

    /**
     * 宠物医生智能问答：根据问题文本在知识库中匹配最可能的健康问题，返回匹配结果与综合回答
     * @param question 用户提问
     * @return 包含 issues(匹配列表) 与 answer(综合建议) 的 Map
     */
    public Map<String, Object> askDoctor(String question);
}
