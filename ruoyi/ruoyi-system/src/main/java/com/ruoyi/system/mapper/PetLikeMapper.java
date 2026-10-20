package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetLike;

/**
 * 宠物点赞 Mapper 接口
 *
 * @author ruoyi
 */
public interface PetLikeMapper
{
    public List<PetLike> selectPetLikeList(PetLike petLike);

    public PetLike selectPetLikeByLikeId(Long likeId);

    /** 查询某用户对某目标（宠物/宠物粮）的点赞记录（判重） */
    public PetLike selectPetLikeByUserAndPet(@Param("userId") Long userId, @Param("petId") Long petId, @Param("targetType") String targetType);

    /** 某目标（宠物/宠物粮）的点赞总数 */
    public int countByPetId(@Param("petId") Long petId, @Param("targetType") String targetType);

    public int insertPetLike(PetLike petLike);

    public int deletePetLikeByLikeId(Long likeId);

    public int deletePetLikeByLikeIds(Long[] likeIds);

    /** 按宠物ID删除（宠物下架时清理） */
    public int deletePetLikeByPetId(Long petId);
}
