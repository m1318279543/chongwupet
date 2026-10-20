package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetHealth;

/**
 * 宠物健康与服务档案 服务层
 *
 * @author ruoyi
 */
public interface IPetHealthService
{
    /**
     * 查询档案列表（后台管理）
     */
    public List<PetHealth> selectPetHealthList(PetHealth petHealth);

    /**
     * 按宠物ID查询档案（前台展示）
     */
    public PetHealth selectPetHealthByPetId(Long petId);

    /**
     * 按档案ID查询
     */
    public PetHealth selectPetHealthByHealthId(Long healthId);

    /**
     * 新增档案（同一宠物只允许一份档案）
     */
    public int insertPetHealth(PetHealth petHealth);

    /**
     * 修改档案
     */
    public int updatePetHealth(PetHealth petHealth);

    /**
     * 批量删除
     */
    public int deletePetHealthByHealthIds(Long[] healthIds);
}
