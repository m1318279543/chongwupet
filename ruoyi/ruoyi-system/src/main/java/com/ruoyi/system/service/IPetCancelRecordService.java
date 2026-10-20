package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetCancelRecord;

/**
 * 预约/订单取消记录 服务层
 *
 * @author ruoyi
 */
public interface IPetCancelRecordService
{
    public List<PetCancelRecord> selectPetCancelRecordList(PetCancelRecord petCancelRecord);

    public PetCancelRecord selectPetCancelRecordByRecordId(Long recordId);

    public int insertPetCancelRecord(PetCancelRecord petCancelRecord);

    public int deletePetCancelRecordByRecordIds(Long[] recordIds);

    public int cleanPetCancelRecord();
}
