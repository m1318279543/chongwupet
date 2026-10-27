package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetFavorite;

/**
 * 收藏管理 数据层
 *
 * @author ruoyi
 */
public interface PetFavoriteMapper
{
    public List<PetFavorite> selectPetFavoriteList(PetFavorite petFavorite);

    /** 我的收藏 petId 集合：只回一列，供前台列表打红心 */
    public List<Long> selectPetIdsByUserId(@Param("userId") Long userId);

    public PetFavorite selectPetFavoriteByFavoriteId(Long favoriteId);

    public int insertPetFavorite(PetFavorite petFavorite);

    public int updatePetFavorite(PetFavorite petFavorite);

    public int deletePetFavoriteByFavoriteId(Long favoriteId);

    public int deletePetFavoriteByFavoriteIds(Long[] favoriteIds);
}
