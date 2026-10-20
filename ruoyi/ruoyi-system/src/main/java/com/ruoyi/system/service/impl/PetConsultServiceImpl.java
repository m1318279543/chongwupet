package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetConsult;
import com.ruoyi.system.mapper.PetConsultMapper;
import com.ruoyi.system.service.IPetConsultService;

/**
 * 客服咨询 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetConsultServiceImpl implements IPetConsultService
{
    @Autowired
    private PetConsultMapper petConsultMapper;

    @Override
    public List<PetConsult> selectPetConsultList(PetConsult petConsult)
    {
        return petConsultMapper.selectPetConsultList(petConsult);
    }

    @Override
    public PetConsult selectPetConsultByConsultId(Long consultId)
    {
        return petConsultMapper.selectPetConsultByConsultId(consultId);
    }

    @Override
    public int insertPetConsult(PetConsult petConsult)
    {
        if (StringUtils.isBlank(petConsult.getStatus()))
        {
            petConsult.setStatus("0");
        }
        return petConsultMapper.insertPetConsult(petConsult);
    }

    @Override
    public int updatePetConsult(PetConsult petConsult)
    {
        return petConsultMapper.updatePetConsult(petConsult);
    }

    @Override
    public int deletePetConsultByConsultIds(Long[] consultIds)
    {
        return petConsultMapper.deletePetConsultByConsultIds(consultIds);
    }
}
