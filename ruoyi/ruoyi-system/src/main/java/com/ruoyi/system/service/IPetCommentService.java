package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetComment;

/**
 * 宠物评论 服务层
 *
 * @author ruoyi
 */
public interface IPetCommentService
{
    public List<PetComment> selectPetCommentList(PetComment petComment);

    public PetComment selectPetCommentByCommentId(Long commentId);

    /** 某目标（宠物/宠物粮）的正常状态评论数 */
    public int countByPetId(Long petId, String targetType);

    /** 评分统计（单目标）：avg/count/分布 */
    public Map<String, Object> scoreStat(Long petId, String targetType);

    /** 评分统计（批量，列表角标） */
    public List<Map<String, Object>> scoreStatBatch(java.util.List<Long> petIds, String targetType);

    public int insertPetComment(PetComment petComment);

    public int updatePetComment(PetComment petComment);

    public int deletePetCommentByCommentIds(Long[] commentIds);
}
