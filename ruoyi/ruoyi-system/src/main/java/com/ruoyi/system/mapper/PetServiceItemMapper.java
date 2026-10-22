package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetServiceItem;

/**
 * 服务项目 Mapper
 *
 * @author ruoyi
 */
public interface PetServiceItemMapper
{
    public List<PetServiceItem> selectPetServiceItemList(PetServiceItem item);

    public PetServiceItem selectPetServiceItemById(Long itemId);

    public int insertPetServiceItem(PetServiceItem item);

    public int updatePetServiceItem(PetServiceItem item);

    public int deletePetServiceItemByIds(Long[] itemIds);

    /** 工单列表按项目ID取名称（内部用） */
    public PetServiceItem selectDefaultReceptionItem(@Param("storeId") Long storeId);
}
