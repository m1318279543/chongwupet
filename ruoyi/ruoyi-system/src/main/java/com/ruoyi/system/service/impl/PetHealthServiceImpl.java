package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.constant.UserConstants;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetHealth;
import com.ruoyi.system.mapper.PetHealthMapper;
import com.ruoyi.system.service.IPetHealthService;

/**
 * 宠物健康与服务档案 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetHealthServiceImpl implements IPetHealthService
{
    @Autowired
    private PetHealthMapper petHealthMapper;

    @Override
    public List<PetHealth> selectPetHealthList(PetHealth petHealth)
    {
        return petHealthMapper.selectPetHealthList(petHealth);
    }

    @Override
    public PetHealth selectPetHealthByPetId(Long petId)
    {
        return petHealthMapper.selectPetHealthByPetId(petId);
    }

    @Override
    public PetHealth selectPetHealthByHealthId(Long healthId)
    {
        return petHealthMapper.selectPetHealthByHealthId(healthId);
    }

    @Override
    public int insertPetHealth(PetHealth petHealth)
    {
        // 一宠一档：已存在则提示
        PetHealth exist = petHealthMapper.selectPetHealthByPetId(petHealth.getPetId());
        if (exist != null)
        {
            throw new ServiceException("该宠物已存在健康档案，请直接修改");
        }
        if (StringUtils.isBlank(petHealth.getArchiveNo()))
        {
            petHealth.setArchiveNo(genArchiveNo(petHealth.getPetId()));
        }
        if (StringUtils.isBlank(petHealth.getStatus()))
        {
            petHealth.setStatus("0");
        }
        return petHealthMapper.insertPetHealth(petHealth);
    }

    @Override
    public int updatePetHealth(PetHealth petHealth)
    {
        return petHealthMapper.updatePetHealth(petHealth);
    }

    @Override
    public int deletePetHealthByHealthIds(Long[] healthIds)
    {
        return petHealthMapper.deletePetHealthByHealthIds(healthIds);
    }

    /** 生成档案编号：PH + 年份 + 6位宠物ID */
    private String genArchiveNo(Long petId)
    {
        java.time.YearMonth now = java.time.YearMonth.now();
        return String.format("PH%s%06d", now.getYear(), petId == null ? 0L : petId);
    }
}
