package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetInfo;

/**
 * 宠物信息 数据层
 *
 * @author ruoyi
 */
public interface PetInfoMapper
{
    public List<PetInfo> selectPetInfoList(PetInfo petInfo);

    /** 首页精选：在售优先，猫狗兔优先，取前 N 条 */
    public List<PetInfo> selectFeaturedPets(@Param("limit") int limit);

    /** 总量统计：总数 / 在售数 / 覆盖分类数 */
    public Map<String, Object> selectPetInfoCounts();

    /** 各分类在售数量，供列表页品类快筛显示 */
    public List<Map<String, Object>> selectPetCountByCategory();

    public PetInfo selectPetInfoByPetId(Long petId);

    public int insertPetInfo(PetInfo petInfo);

    public int updatePetInfo(PetInfo petInfo);

    public int deletePetInfoByPetId(Long petId);

    public int deletePetInfoByPetIds(Long[] petIds);

    /**
     * 下单占位：仅在「在售」时改成「已售」，返回 0 说明已被别人订走。
     * 用带条件的 UPDATE 做 CAS，避免两个人同时下单买走同一只。
     */
    public int lockPet(Long petId);

    /** 取消订单时把宠物放回「在售」 */
    public int releasePet(Long petId);
}
