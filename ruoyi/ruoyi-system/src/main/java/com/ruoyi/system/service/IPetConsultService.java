package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetConsult;

/**
 * 客服咨询 服务层
 *
 * @author ruoyi
 */
public interface IPetConsultService
{
    public List<PetConsult> selectPetConsultList(PetConsult petConsult);

    public PetConsult selectPetConsultByConsultId(Long consultId);

    public int insertPetConsult(PetConsult petConsult);

    public int updatePetConsult(PetConsult petConsult);

    public int deletePetConsultByConsultIds(Long[] consultIds);
}
