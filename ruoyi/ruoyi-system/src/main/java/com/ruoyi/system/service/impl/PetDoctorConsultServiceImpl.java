package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetDoctorConsult;
import com.ruoyi.system.mapper.PetDoctorConsultMapper;
import com.ruoyi.system.service.IPetDoctorConsultService;

/**
 * 宠物医生咨询记录 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetDoctorConsultServiceImpl implements IPetDoctorConsultService
{
    @Autowired
    private PetDoctorConsultMapper petDoctorConsultMapper;

    @Override
    public List<PetDoctorConsult> selectPetDoctorConsultList(PetDoctorConsult petDoctorConsult)
    {
        return petDoctorConsultMapper.selectPetDoctorConsultList(petDoctorConsult);
    }

    @Override
    public PetDoctorConsult selectPetDoctorConsultByConsultId(Long consultId)
    {
        return petDoctorConsultMapper.selectPetDoctorConsultByConsultId(consultId);
    }

    @Override
    public int insertPetDoctorConsult(PetDoctorConsult petDoctorConsult)
    {
        if (petDoctorConsult.getDelFlag() == null)
        {
            petDoctorConsult.setDelFlag("0");
        }
        return petDoctorConsultMapper.insertPetDoctorConsult(petDoctorConsult);
    }

    @Override
    public int deletePetDoctorConsultByConsultIds(Long[] consultIds)
    {
        return petDoctorConsultMapper.deletePetDoctorConsultByConsultIds(consultIds);
    }

    @Override
    public int cleanPetDoctorConsult()
    {
        return petDoctorConsultMapper.deletePetDoctorConsultAll();
    }
}
