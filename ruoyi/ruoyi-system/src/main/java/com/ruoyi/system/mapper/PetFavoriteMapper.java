package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetFavorite;

/**
 * 收藏管理 数据层
 *
 * @author ruoyi
 */
public interface PetFavoriteMapper
{
    public List<PetFavorite> selectPetFavoriteList(PetFavorite petFavorite);

    public PetFavorite selectPetFavoriteByFavoriteId(Long favoriteId);

    public int insertPetFavorite(PetFavorite petFavorite);

    public int updatePetFavorite(PetFavorite petFavorite);

    public int deletePetFavoriteByFavoriteId(Long favoriteId);

    public int deletePetFavoriteByFavoriteIds(Long[] favoriteIds);
}
