package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetInfo;

/**
 * 宠物信息 服务层
 *
 * @author ruoyi
 */
public interface IPetInfoService
{
    public List<PetInfo> selectPetInfoList(PetInfo petInfo);

    /** 首页精选（在售优先，猫狗兔优先） */
    public List<PetInfo> selectFeaturedPets(int limit);

    /** 概览统计：总数 / 在售数 / 分类数 */
    public Map<String, Object> selectPetInfoCounts();

    /** 各分类数量 */
    public List<Map<String, Object>> selectPetCountByCategory();

    public PetInfo selectPetInfoByPetId(Long petId);

    public int insertPetInfo(PetInfo petInfo);

    public int updatePetInfo(PetInfo petInfo);

    public int deletePetInfoByPetIds(Long[] petIds);

    public int deletePetInfoByPetId(Long petId);
}
