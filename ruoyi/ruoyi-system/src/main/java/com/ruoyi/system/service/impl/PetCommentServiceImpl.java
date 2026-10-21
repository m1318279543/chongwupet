package com.ruoyi.system.service.impl;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.utils.DateUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetComment;
import com.ruoyi.system.mapper.PetCommentMapper;
import com.ruoyi.system.service.IPetCommentService;

/**
 * 宠物评论 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetCommentServiceImpl implements IPetCommentService
{
    @Autowired
    private PetCommentMapper petCommentMapper;

    @Override
    public List<PetComment> selectPetCommentList(PetComment petComment)
    {
        return petCommentMapper.selectPetCommentList(petComment);
    }

    @Override
    public PetComment selectPetCommentByCommentId(Long commentId)
    {
        return petCommentMapper.selectPetCommentByCommentId(commentId);
    }

    @Override
    public int countByPetId(Long petId, String targetType)
    {
        return petCommentMapper.countByPetId(petId, targetType == null ? "pet" : targetType);
    }

    @Override
    public Map<String, Object> scoreStat(Long petId, String targetType)
    {
        return petCommentMapper.scoreStat(petId, targetType == null ? "pet" : targetType);
    }

    @Override
    public List<Map<String, Object>> scoreStatBatch(List<Long> petIds, String targetType)
    {
        return petCommentMapper.scoreStatBatch(petIds, targetType == null ? "pet" : targetType);
    }

    @Override
    public int insertPetComment(PetComment petComment)
    {
        if (petComment.getPetId() == null)
        {
            throw new com.ruoyi.common.exception.ServiceException("目标ID不能为空");
        }
        if (petComment.getTargetType() == null || petComment.getTargetType().isEmpty())
        {
            petComment.setTargetType("pet");
        }
        if (StringUtils.isEmpty(petComment.getContent()) || petComment.getContent().trim().length() == 0)
        {
            throw new com.ruoyi.common.exception.ServiceException("评论内容不能为空");
        }
        if (petComment.getContent().length() > 500)
        {
            throw new com.ruoyi.common.exception.ServiceException("评论内容不能超过500字");
        }
        petComment.setContent(petComment.getContent().trim());
        petComment.setCreateTime(DateUtils.getNowDate());
        return petCommentMapper.insertPetComment(petComment);
    }

    @Override
    public int updatePetComment(PetComment petComment)
    {
        petComment.setUpdateTime(DateUtils.getNowDate());
        return petCommentMapper.updatePetComment(petComment);
    }

    @Override
    public int deletePetCommentByCommentIds(Long[] commentIds)
    {
        return petCommentMapper.deletePetCommentByCommentIds(commentIds);
    }
}
