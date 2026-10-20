package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetConsult;

/**
 * 客服咨询 数据层
 *
 * @author ruoyi
 */
public interface PetConsultMapper
{
    public List<PetConsult> selectPetConsultList(PetConsult petConsult);

    public PetConsult selectPetConsultByConsultId(Long consultId);

    public int insertPetConsult(PetConsult petConsult);

    public int updatePetConsult(PetConsult petConsult);

    public int deletePetConsultByConsultIds(Long[] consultIds);
}
