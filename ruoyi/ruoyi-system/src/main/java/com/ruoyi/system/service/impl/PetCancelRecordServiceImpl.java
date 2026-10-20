package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.system.domain.PetCancelRecord;
import com.ruoyi.system.mapper.PetCancelRecordMapper;
import com.ruoyi.system.service.IPetCancelRecordService;

/**
 * 预约/订单取消记录 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetCancelRecordServiceImpl implements IPetCancelRecordService
{
    @Autowired
    private PetCancelRecordMapper petCancelRecordMapper;

    @Override
    public List<PetCancelRecord> selectPetCancelRecordList(PetCancelRecord petCancelRecord)
    {
        return petCancelRecordMapper.selectPetCancelRecordList(petCancelRecord);
    }

    @Override
    public PetCancelRecord selectPetCancelRecordByRecordId(Long recordId)
    {
        return petCancelRecordMapper.selectPetCancelRecordByRecordId(recordId);
    }

    @Override
    public int insertPetCancelRecord(PetCancelRecord petCancelRecord)
    {
        if (petCancelRecord.getDelFlag() == null)
        {
            petCancelRecord.setDelFlag("0");
        }
        return petCancelRecordMapper.insertPetCancelRecord(petCancelRecord);
    }

    @Override
    public int deletePetCancelRecordByRecordIds(Long[] recordIds)
    {
        return petCancelRecordMapper.deletePetCancelRecordByRecordIds(recordIds);
    }

    @Override
    public int cleanPetCancelRecord()
    {
        return petCancelRecordMapper.deletePetCancelRecordAll();
    }
}
