package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.domain.PetOwner;

/**
 * 客户档案 数据层
 *
 * @author ruoyi
 */
public interface PetCustomerMapper
{
    /** 查询客户列表（含门店名与名下宠物数） */
    public List<PetCustomer> selectPetCustomerList(PetCustomer petCustomer);

    /** 通过ID查询客户 */
    public PetCustomer selectPetCustomerByCustomerId(Long customerId);

    /** 查询客户名下宠物 */
    public List<PetOwner> selectPetsByCustomerId(Long customerId);

    /** 按账号查客户ID（业务写入时用） */
    public Long selectCustomerIdByUserId(@Param("userId") Long userId);

    /** 按账号查客户档案（含归属门店，业务写入时用） */
    public PetCustomer selectPetCustomerByUserId(@Param("userId") Long userId);

    /** 新增客户 */
    public int insertPetCustomer(PetCustomer petCustomer);

    /** 修改客户 */
    public int updatePetCustomer(PetCustomer petCustomer);

    /** 批量删除客户 */
    public int deletePetCustomerByCustomerIds(Long[] customerIds);

    /** 统计客户名下宠物数 */
    public int countPetsByCustomerId(Long customerId);
}
