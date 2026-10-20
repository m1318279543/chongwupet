package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetPreference;

/**
 * 宠物喜好 数据层
 *
 * @author ruoyi
 */
public interface PetPreferenceMapper
{
    public List<PetPreference> selectPetPreferenceList(PetPreference petPreference);

    public PetPreference selectPetPreferenceByPetId(Long petId);

    public PetPreference selectPetPreferenceByPreferenceId(Long preferenceId);

    public int insertPetPreference(PetPreference petPreference);

    public int updatePetPreference(PetPreference petPreference);

    public int deletePetPreferenceByPreferenceIds(Long[] preferenceIds);

    public int deletePetPreferenceByPetId(Long petId);
}
