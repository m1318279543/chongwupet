package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetHealthIssue;

/**
 * 宠物常见健康问题 数据层
 *
 * @author ruoyi
 */
public interface PetHealthIssueMapper
{
    public List<PetHealthIssue> selectPetHealthIssueList(PetHealthIssue petHealthIssue);

    public PetHealthIssue selectPetHealthIssueByIssueId(Long issueId);

    public List<PetHealthIssue> selectPetHealthIssueByFamily(String family);

    public int insertPetHealthIssue(PetHealthIssue petHealthIssue);

    public int updatePetHealthIssue(PetHealthIssue petHealthIssue);

    public int deletePetHealthIssueByIssueIds(Long[] issueIds);
}
