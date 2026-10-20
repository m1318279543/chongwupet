package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetInfo;

/**
 * 宠物信息 服务层
 *
 * @author ruoyi
 */
public interface IPetInfoService
{
    public List<PetInfo> selectPetInfoList(PetInfo petInfo);

    public PetInfo selectPetInfoByPetId(Long petId);

    public int insertPetInfo(PetInfo petInfo);

    public int updatePetInfo(PetInfo petInfo);

    public int deletePetInfoByPetIds(Long[] petIds);

    public int deletePetInfoByPetId(Long petId);
}
