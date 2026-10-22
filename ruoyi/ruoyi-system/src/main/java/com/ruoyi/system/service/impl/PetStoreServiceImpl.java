package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetStaff;
import com.ruoyi.system.domain.PetStore;
import com.ruoyi.system.mapper.PetStoreMapper;
import com.ruoyi.system.service.IPetStoreService;

/**
 * 门店 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetStoreServiceImpl implements IPetStoreService
{
    @Autowired
    private PetStoreMapper petStoreMapper;

    @Override
    public List<PetStore> selectPetStoreList(PetStore petStore)
    {
        return petStoreMapper.selectPetStoreList(petStore);
    }

    @Override
    public PetStore selectPetStoreByStoreId(Long storeId)
    {
        return petStoreMapper.selectPetStoreByStoreId(storeId);
    }

    @Override
    public int insertPetStore(PetStore petStore)
    {
        if (StringUtils.isBlank(petStore.getStoreCode()))
        {
            throw new ServiceException("门店编码不能为空");
        }
        petStore.setStatus(StringUtils.isBlank(petStore.getStatus()) ? "0" : petStore.getStatus());
        return petStoreMapper.insertPetStore(petStore);
    }

    @Override
    public int updatePetStore(PetStore petStore)
    {
        return petStoreMapper.updatePetStore(petStore);
    }

    /**
     * 删除门店前先校验：店内还有宠物或员工时不允许删除，
     * 避免把存量业务数据变成"无主数据"。
     */
    @Override
    public int deletePetStoreByStoreIds(Long[] storeIds)
    {
        for (Long storeId : storeIds)
        {
            PetStore store = petStoreMapper.selectPetStoreByStoreId(storeId);
            if (store == null)
            {
                continue;
            }
            if (store.getPetCount() != null && store.getPetCount() > 0)
            {
                throw new ServiceException("门店【" + store.getStoreName() + "】还有 " + store.getPetCount() + " 只在店宠物，请先调拨或下架");
            }
            if (store.getStaffCount() != null && store.getStaffCount() > 0)
            {
                throw new ServiceException("门店【" + store.getStoreName() + "】还有 " + store.getStaffCount() + " 名在职员工，请先转店");
            }
        }
        return petStoreMapper.deletePetStoreByStoreIds(storeIds);
    }

    @Override
    public List<PetStaff> selectStaffByStoreId(Long storeId)
    {
        return petStoreMapper.selectStaffByStoreId(storeId);
    }
}
