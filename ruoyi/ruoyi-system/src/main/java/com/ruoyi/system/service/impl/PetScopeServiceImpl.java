package com.ruoyi.system.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetStaff;
import com.ruoyi.system.mapper.PetStoreMapper;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 门店数据范围 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetScopeServiceImpl implements IPetScopeService
{
    @Autowired
    private PetStoreMapper petStoreMapper;

    @Override
    public Long currentStoreId()
    {
        // 门店选项等接口允许游客访问；未登录时 getUserId() 会抛异常，按「无门店归属」处理
        Long userId;
        try
        {
            userId = SecurityUtils.getUserId();
        }
        catch (Exception e)
        {
            return -1L;
        }
        if (SecurityUtils.isAdmin(userId))
        {
            return null;
        }
        if (userId == null)
        {
            return -1L;
        }
        PetStaff staff = petStoreMapper.selectStaffByUserId(userId);
        if (staff == null || staff.getStoreId() == null)
        {
            return -1L;
        }
        return staff.getStoreId();
    }

    @Override
    public void assertStoreAccessible(Long storeId)
    {
        Long scope = currentStoreId();
        if (scope == null)
        {
            return;
        }
        if (scope < 0 || storeId == null || !scope.equals(storeId))
        {
            throw new ServiceException("无权访问其他门店的数据");
        }
    }
}
