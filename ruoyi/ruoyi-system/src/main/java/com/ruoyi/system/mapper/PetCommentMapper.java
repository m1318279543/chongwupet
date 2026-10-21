package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetComment;

/**
 * 宠物评论 Mapper 接口
 *
 * @author ruoyi
 */
public interface PetCommentMapper
{
    public List<PetComment> selectPetCommentList(PetComment petComment);

    public PetComment selectPetCommentByCommentId(Long commentId);

    /** 某目标（宠物/宠物粮）的正常状态评论数 */
    public int countByPetId(@Param("petId") Long petId, @Param("targetType") String targetType);

    /** 单个目标评分统计：count/avg/dist1~dist5 */
    public Map<String, Object> scoreStat(@Param("petId") Long petId, @Param("targetType") String targetType);

    /** 批量评分统计（列表卡片角标）：pet_id -> avg/count */
    public List<Map<String, Object>> scoreStatBatch(@Param("petIds") List<Long> petIds, @Param("targetType") String targetType);

    public int insertPetComment(PetComment petComment);

    public int updatePetComment(PetComment petComment);

    public int deletePetCommentByCommentId(Long commentId);

    public int deletePetCommentByCommentIds(Long[] commentIds);

    public int deletePetCommentByPetId(Long petId);
}
