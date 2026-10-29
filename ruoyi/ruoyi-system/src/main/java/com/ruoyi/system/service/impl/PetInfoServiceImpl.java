package com.ruoyi.system.service.impl;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.mapper.PetInfoMapper;
import com.ruoyi.system.service.IPetInfoService;

/**
 * 宠物信息 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetInfoServiceImpl implements IPetInfoService
{
    @Autowired
    private PetInfoMapper petInfoMapper;

    @Override
    public List<PetInfo> selectPetInfoList(PetInfo petInfo)
    {
        return petInfoMapper.selectPetInfoList(petInfo);
    }

    @Override
    public List<PetInfo> selectFeaturedPets(int limit)
    {
        return petInfoMapper.selectFeaturedPets(limit);
    }

    @Override
    public Map<String, Object> selectPetInfoCounts()
    {
        return petInfoMapper.selectPetInfoCounts();
    }

    @Override
    public List<Map<String, Object>> selectPetCountByCategory()
    {
        return petInfoMapper.selectPetCountByCategory();
    }

    @Override
    public PetInfo selectPetInfoByPetId(Long petId)
    {
        return petInfoMapper.selectPetInfoByPetId(petId);
    }

    @Override
    public int insertPetInfo(PetInfo petInfo)
    {
        return petInfoMapper.insertPetInfo(petInfo);
    }

    @Override
    public int updatePetInfo(PetInfo petInfo)
    {
        return petInfoMapper.updatePetInfo(petInfo);
    }

    @Override
    public int deletePetInfoByPetIds(Long[] petIds)
    {
        return petInfoMapper.deletePetInfoByPetIds(petIds);
    }

    @Override
    public int deletePetInfoByPetId(Long petId)
    {
        return petInfoMapper.deletePetInfoByPetId(petId);
    }
}
