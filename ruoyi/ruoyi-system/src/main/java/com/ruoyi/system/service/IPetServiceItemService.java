package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetServiceItem;

/**
 * 服务项目 服务层
 *
 * @author ruoyi
 */
public interface IPetServiceItemService
{
    public List<PetServiceItem> selectPetServiceItemList(PetServiceItem item);

    public PetServiceItem selectPetServiceItemById(Long itemId);

    public int insertPetServiceItem(PetServiceItem item);

    public int updatePetServiceItem(PetServiceItem item);

    public int deletePetServiceItemByIds(Long[] itemIds);
}
