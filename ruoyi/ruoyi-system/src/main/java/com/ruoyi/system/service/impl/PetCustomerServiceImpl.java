package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.domain.PetOwner;
import com.ruoyi.system.mapper.PetCustomerMapper;
import com.ruoyi.system.service.IPetCustomerService;

/**
 * 客户档案 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetCustomerServiceImpl implements IPetCustomerService
{
    @Autowired
    private PetCustomerMapper petCustomerMapper;

    @Override
    public List<PetCustomer> selectPetCustomerList(PetCustomer petCustomer)
    {
        return petCustomerMapper.selectPetCustomerList(petCustomer);
    }

    /** 详情：客户档案 + 名下宠物（当前主人 / 历史 / 仅关注） */
    @Override
    public PetCustomer selectPetCustomerByCustomerId(Long customerId)
    {
        PetCustomer customer = petCustomerMapper.selectPetCustomerByCustomerId(customerId);
        if (customer != null)
        {
            customer.setPets(petCustomerMapper.selectPetsByCustomerId(customerId));
        }
        return customer;
    }

    @Override
    public List<PetOwner> selectPetsByCustomerId(Long customerId)
    {
        // 同一只宠物可能有多条归属记录（历史转手），展示层按 petId 去重
        List<PetOwner> rows = petCustomerMapper.selectPetsByCustomerId(customerId);
        if (rows == null || rows.size() <= 1)
        {
            return rows;
        }
        java.util.Map<Long, PetOwner> unique = new java.util.LinkedHashMap<>();
        for (PetOwner one : rows)
        {
            unique.putIfAbsent(one.getPetId(), one);
        }
        return new java.util.ArrayList<>(unique.values());
    }

    @Override
    public PetCustomer selectPetCustomerByUserId(Long userId)
    {
        if (userId == null)
        {
            return null;
        }
        return petCustomerMapper.selectPetCustomerByUserId(userId);
    }

    @Override
    public int insertPetCustomer(PetCustomer petCustomer)
    {
        if (StringUtils.isBlank(petCustomer.getCustomerName()))
        {
            throw new ServiceException("客户姓名不能为空");
        }
        if (StringUtils.isBlank(petCustomer.getCustomerCode()))
        {
            petCustomer.setCustomerCode("C" + System.currentTimeMillis());
        }
        petCustomer.setLevel(StringUtils.isBlank(petCustomer.getLevel()) ? "普通" : petCustomer.getLevel());
        petCustomer.setSource(StringUtils.isBlank(petCustomer.getSource()) ? "到店" : petCustomer.getSource());
        petCustomer.setStatus(StringUtils.isBlank(petCustomer.getStatus()) ? "0" : petCustomer.getStatus());
        return petCustomerMapper.insertPetCustomer(petCustomer);
    }

    @Override
    public int updatePetCustomer(PetCustomer petCustomer)
    {
        return petCustomerMapper.updatePetCustomer(petCustomer);
    }

    /** 名下有宠物的客户不允许直接删除，避免宠物归属断链 */
    @Override
    public int deletePetCustomerByCustomerIds(Long[] customerIds)
    {
        for (Long customerId : customerIds)
        {
            int pets = petCustomerMapper.countPetsByCustomerId(customerId);
            if (pets > 0)
            {
                throw new ServiceException("该客户名下还有 " + pets + " 只宠物，请先解除归属");
            }
        }
        return petCustomerMapper.deletePetCustomerByCustomerIds(customerIds);
    }
}
