package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.domain.PetOwner;

/**
 * 客户档案 服务层
 *
 * @author ruoyi
 */
public interface IPetCustomerService
{
    /** 查询客户列表 */
    public List<PetCustomer> selectPetCustomerList(PetCustomer petCustomer);

    /** 通过ID查询客户（含名下宠物） */
    public PetCustomer selectPetCustomerByCustomerId(Long customerId);

    /** 查询客户名下宠物 */
    public List<PetOwner> selectPetsByCustomerId(Long customerId);

    /** 按登录账号查客户档案（业务写入时取归属门店） */
    public PetCustomer selectPetCustomerByUserId(Long userId);

    /** 新增客户 */
    public int insertPetCustomer(PetCustomer petCustomer);

    /** 修改客户 */
    public int updatePetCustomer(PetCustomer petCustomer);

    /** 批量删除客户 */
    public int deletePetCustomerByCustomerIds(Long[] customerIds);
}
