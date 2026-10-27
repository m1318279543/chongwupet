package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetFavorite;
import com.ruoyi.system.mapper.PetFavoriteMapper;
import com.ruoyi.system.service.IPetFavoriteService;

/**
 * 收藏管理 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetFavoriteServiceImpl implements IPetFavoriteService
{
    @Autowired
    private PetFavoriteMapper petFavoriteMapper;

    @Override
    public List<PetFavorite> selectPetFavoriteList(PetFavorite petFavorite)
    {
        return petFavoriteMapper.selectPetFavoriteList(petFavorite);
    }

    @Override
    public List<Long> selectPetIdsByUserId(Long userId)
    {
        return petFavoriteMapper.selectPetIdsByUserId(userId);
    }

    @Override
    public PetFavorite selectPetFavoriteByFavoriteId(Long favoriteId)
    {
        return petFavoriteMapper.selectPetFavoriteByFavoriteId(favoriteId);
    }

    @Override
    public int insertPetFavorite(PetFavorite petFavorite)
    {
        return petFavoriteMapper.insertPetFavorite(petFavorite);
    }

    @Override
    public int deletePetFavoriteByFavoriteIds(Long[] favoriteIds)
    {
        return petFavoriteMapper.deletePetFavoriteByFavoriteIds(favoriteIds);
    }

    @Override
    public int deletePetFavoriteByFavoriteId(Long favoriteId)
    {
        return petFavoriteMapper.deletePetFavoriteByFavoriteId(favoriteId);
    }
}
