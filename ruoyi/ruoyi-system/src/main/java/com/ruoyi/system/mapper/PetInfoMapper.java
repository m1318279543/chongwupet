package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetInfo;

/**
 * 宠物信息 数据层
 *
 * @author ruoyi
 */
public interface PetInfoMapper
{
    public List<PetInfo> selectPetInfoList(PetInfo petInfo);

    public PetInfo selectPetInfoByPetId(Long petId);

    public int insertPetInfo(PetInfo petInfo);

    public int updatePetInfo(PetInfo petInfo);

    public int deletePetInfoByPetId(Long petId);

    public int deletePetInfoByPetIds(Long[] petIds);
}
