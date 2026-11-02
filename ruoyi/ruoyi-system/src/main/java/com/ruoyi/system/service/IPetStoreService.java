package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetStaff;
import com.ruoyi.system.domain.PetStore;

/**
 * 门店 服务层
 *
 * @author ruoyi
 */
public interface IPetStoreService
{
    /** 查询门店列表 */
    public List<PetStore> selectPetStoreList(PetStore petStore);

    /** 通过ID查询门店 */
    public PetStore selectPetStoreByStoreId(Long storeId);

    /** 新增门店 */
    public int insertPetStore(PetStore petStore);

    /** 修改门店 */
    public int updatePetStore(PetStore petStore);

    /** 批量删除门店 */
    public int deletePetStoreByStoreIds(Long[] storeIds);

    /** 查询门店在职员工 */
    public List<PetStaff> selectStaffByStoreId(Long storeId);

    /** 新增员工 */
    public int insertPetStaff(PetStaff staff);

    /** 修改员工 */
    public int updatePetStaff(PetStaff staff);

    /** 批量删除员工 */
    public int deletePetStaffByIds(Long[] staffIds);

    /** 通过ID查询员工 */
    public PetStaff selectPetStaffByStaffId(Long staffId);
}
