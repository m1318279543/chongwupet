package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.PetLike;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.mapper.PetLikeMapper;
import com.ruoyi.system.mapper.PetInfoMapper;
import com.ruoyi.system.service.IPetLikeService;

/**
 * 宠物点赞 服务实现
 * pet_info.like_count 做冗余计数，点赞/取消时同步增减
 *
 * @author ruoyi
 */
@Service
public class PetLikeServiceImpl implements IPetLikeService
{
    @Autowired
    private PetLikeMapper petLikeMapper;

    @Autowired
    private PetInfoMapper petInfoMapper;

    @Override
    public List<PetLike> selectPetLikeList(PetLike petLike)
    {
        return petLikeMapper.selectPetLikeList(petLike);
    }

    @Override
    public PetLike selectPetLikeByLikeId(Long likeId)
    {
        return petLikeMapper.selectPetLikeByLikeId(likeId);
    }

    @Override
    public boolean isLiked(Long userId, Long petId, String targetType)
    {
        return petLikeMapper.selectPetLikeByUserAndPet(userId, petId, normType(targetType)) != null;
    }

    @Override
    public int countByPetId(Long petId, String targetType)
    {
        return petLikeMapper.countByPetId(petId, normType(targetType));
    }

    @Override
    @Transactional
    public int like(Long userId, Long petId, String targetType)
    {
        String type = normType(targetType);
        if ("pet".equals(type))
        {
            if (petInfoMapper.selectPetInfoByPetId(petId) == null)
            {
                throw new ServiceException("宠物不存在");
            }
        }
        if (petLikeMapper.selectPetLikeByUserAndPet(userId, petId, type) != null)
        {
            return petLikeMapper.countByPetId(petId, type);   // 幂等：已赞直接返回
        }
        PetLike like = new PetLike();
        like.setUserId(userId);
        like.setPetId(petId);
        like.setTargetType(type);
        petLikeMapper.insertPetLike(like);
        syncCount(petId, type);
        return petLikeMapper.countByPetId(petId, type);
    }

    @Override
    @Transactional
    public int unlike(Long userId, Long petId, String targetType)
    {
        String type = normType(targetType);
        PetLike exist = petLikeMapper.selectPetLikeByUserAndPet(userId, petId, type);
        if (exist != null)
        {
            petLikeMapper.deletePetLikeByLikeId(exist.getLikeId());
            syncCount(petId, type);
        }
        return petLikeMapper.countByPetId(petId, type);
    }

    @Override
    public int deletePetLikeByLikeIds(Long[] likeIds)
    {
        int n = 0;
        for (Long id : likeIds)
        {
            PetLike like = petLikeMapper.selectPetLikeByLikeId(id);
            if (like != null)
            {
                n += petLikeMapper.deletePetLikeByLikeId(id);
                syncCount(like.getPetId(), like.getTargetType());
            }
        }
        return n;
    }

    /** 统一目标类型：null/空/非 food 一律视为 pet */
    private String normType(String targetType)
    {
        return "food".equals(targetType) ? "food" : "pet";
    }

    /** 以 pet_like 实际行数为准，回写 pet_info.like_count（仅宠物需要，宠物粮无 pet_info 记录） */
    private void syncCount(Long petId, String targetType)
    {
        if (!"pet".equals(targetType))
        {
            return;
        }
        PetInfo info = new PetInfo();
        info.setPetId(petId);
        info.setLikeCount(petLikeMapper.countByPetId(petId, "pet"));
        petInfoMapper.updatePetInfo(info);
    }
}
