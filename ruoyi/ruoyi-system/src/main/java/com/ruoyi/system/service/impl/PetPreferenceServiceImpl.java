package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetPreference;
import com.ruoyi.system.mapper.PetPreferenceMapper;
import com.ruoyi.system.service.IPetPreferenceService;

/**
 * 宠物喜好 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetPreferenceServiceImpl implements IPetPreferenceService
{
    @Autowired
    private PetPreferenceMapper petPreferenceMapper;

    @Override
    public List<PetPreference> selectPetPreferenceList(PetPreference petPreference)
    {
        return petPreferenceMapper.selectPetPreferenceList(petPreference);
    }

    @Override
    public PetPreference selectPetPreferenceByPetId(Long petId)
    {
        return petPreferenceMapper.selectPetPreferenceByPetId(petId);
    }

    @Override
    public PetPreference selectPetPreferenceByPreferenceId(Long preferenceId)
    {
        return petPreferenceMapper.selectPetPreferenceByPreferenceId(preferenceId);
    }

    @Override
    public int insertPetPreference(PetPreference petPreference)
    {
        if (petPreference.getPetId() == null)
        {
            throw new ServiceException("请关联宠物ID");
        }
        PetPreference exist = petPreferenceMapper.selectPetPreferenceByPetId(petPreference.getPetId());
        if (exist != null)
        {
            throw new ServiceException("该宠物已存在喜好记录，请直接修改");
        }
        if (StringUtils.isBlank(petPreference.getStatus()))
        {
            petPreference.setStatus("0");
        }
        return petPreferenceMapper.insertPetPreference(petPreference);
    }

    @Override
    public int updatePetPreference(PetPreference petPreference)
    {
        return petPreferenceMapper.updatePetPreference(petPreference);
    }

    @Override
    public int deletePetPreferenceByPreferenceIds(Long[] preferenceIds)
    {
        return petPreferenceMapper.deletePetPreferenceByPreferenceIds(preferenceIds);
    }
}
