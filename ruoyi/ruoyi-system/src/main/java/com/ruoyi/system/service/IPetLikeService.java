package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetLike;

/**
 * 宠物点赞 服务层
 *
 * @author ruoyi
 */
public interface IPetLikeService
{
    public List<PetLike> selectPetLikeList(PetLike petLike);

    public PetLike selectPetLikeByLikeId(Long likeId);

    /** 某用户是否已点赞某目标（宠物/宠物粮） */
    public boolean isLiked(Long userId, Long petId, String targetType);

    /** 某目标（宠物/宠物粮）的点赞总数 */
    public int countByPetId(Long petId, String targetType);

    /**
     * 点赞（幂等：重复点赞直接返回当前总数）
     * @return 点赞后的总赞数
     */
    public int like(Long userId, Long petId, String targetType);

    /**
     * 取消点赞（幂等）
     * @return 取消后的总赞数
     */
    public int unlike(Long userId, Long petId, String targetType);

    public int deletePetLikeByLikeIds(Long[] likeIds);
}
