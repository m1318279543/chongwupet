package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetFavorite;

/**
 * 收藏管理 服务层
 *
 * @author ruoyi
 */
public interface IPetFavoriteService
{
    public List<PetFavorite> selectPetFavoriteList(PetFavorite petFavorite);

    /** 我的收藏 petId 集合 */
    public List<Long> selectPetIdsByUserId(Long userId);

    public PetFavorite selectPetFavoriteByFavoriteId(Long favoriteId);

    public int insertPetFavorite(PetFavorite petFavorite);

    public int deletePetFavoriteByFavoriteIds(Long[] favoriteIds);

    public int deletePetFavoriteByFavoriteId(Long favoriteId);
}
