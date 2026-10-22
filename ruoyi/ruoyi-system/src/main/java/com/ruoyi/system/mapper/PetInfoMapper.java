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

    /**
     * 下单占位：仅在「在售」时改成「已售」，返回 0 说明已被别人订走。
     * 用带条件的 UPDATE 做 CAS，避免两个人同时下单买走同一只。
     */
    public int lockPet(Long petId);

    /** 取消订单时把宠物放回「在售」 */
    public int releasePet(Long petId);
}
