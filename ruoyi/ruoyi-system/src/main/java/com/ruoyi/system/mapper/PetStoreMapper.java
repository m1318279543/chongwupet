package com.ruoyi.system.mapper;

import java.util.List;
import com.ruoyi.system.domain.PetStaff;
import com.ruoyi.system.domain.PetStore;

/**
 * 门店 数据层
 *
 * @author ruoyi
 */
public interface PetStoreMapper
{
    /** 查询门店列表（含宠物/员工/客户统计） */
    public List<PetStore> selectPetStoreList(PetStore petStore);

    /** 通过ID查询门店 */
    public PetStore selectPetStoreByStoreId(Long storeId);

    /** 新增门店 */
    public int insertPetStore(PetStore petStore);

    /** 修改门店 */
    public int updatePetStore(PetStore petStore);

    /** 批量删除门店 */
    public int deletePetStoreByStoreIds(Long[] storeIds);

    /** 查询某门店在职员工 */
    public List<PetStaff> selectStaffByStoreId(Long storeId);

    /** 按账号查员工档案（门店数据范围用） */
    public PetStaff selectStaffByUserId(Long userId);
}
