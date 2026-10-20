package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetCancelRecord;

/**
 * 预约/订单取消记录 Mapper
 *
 * @author ruoyi
 */
public interface PetCancelRecordMapper
{
    /** 查询取消记录列表 */
    public List<PetCancelRecord> selectPetCancelRecordList(PetCancelRecord petCancelRecord);

    /** 按ID查询 */
    public PetCancelRecord selectPetCancelRecordByRecordId(Long recordId);

    /** 新增取消记录 */
    public int insertPetCancelRecord(PetCancelRecord petCancelRecord);

    /** 批量删除 */
    public int deletePetCancelRecordByRecordIds(Long[] recordIds);

    /** 清空全部取消记录 */
    public int deletePetCancelRecordAll();
}
