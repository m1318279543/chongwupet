package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetServiceItem;
import com.ruoyi.system.mapper.PetServiceItemMapper;
import com.ruoyi.system.service.IPetServiceItemService;

/**
 * 服务项目 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetServiceItemServiceImpl implements IPetServiceItemService
{
    @Autowired
    private PetServiceItemMapper petServiceItemMapper;

    @Override
    public List<PetServiceItem> selectPetServiceItemList(PetServiceItem item)
    {
        return petServiceItemMapper.selectPetServiceItemList(item);
    }

    @Override
    public PetServiceItem selectPetServiceItemById(Long itemId)
    {
        return petServiceItemMapper.selectPetServiceItemById(itemId);
    }

    @Override
    public int insertPetServiceItem(PetServiceItem item)
    {
        if (StringUtils.isBlank(item.getItemName()))
        {
            throw new ServiceException("项目名称不能为空");
        }
        if (item.getPrice() == null)
        {
            throw new ServiceException("请填写项目价格");
        }
        item.setStatus(StringUtils.isBlank(item.getStatus()) ? "0" : item.getStatus());
        item.setSort(item.getSort() == null ? 99 : item.getSort());
        return petServiceItemMapper.insertPetServiceItem(item);
    }

    @Override
    public int updatePetServiceItem(PetServiceItem item)
    {
        if (item.getItemId() == null)
        {
            throw new ServiceException("项目ID不能为空");
        }
        return petServiceItemMapper.updatePetServiceItem(item);
    }

    @Override
    public int deletePetServiceItemByIds(Long[] itemIds)
    {
        return petServiceItemMapper.deletePetServiceItemByIds(itemIds);
    }
}
