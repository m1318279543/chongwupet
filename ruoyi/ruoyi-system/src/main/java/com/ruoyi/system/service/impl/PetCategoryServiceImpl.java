package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.PetCategory;
import com.ruoyi.system.mapper.PetCategoryMapper;
import com.ruoyi.system.service.IPetCategoryService;

/**
 * 宠物分类 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetCategoryServiceImpl implements IPetCategoryService
{
    @Autowired
    private PetCategoryMapper petCategoryMapper;

    /**
     * 查询宠物分类列表
     *
     * @param petCategory 宠物分类
     * @return 宠物分类集合
     */
    @Override
    public List<PetCategory> selectPetCategoryList(PetCategory petCategory)
    {
        return petCategoryMapper.selectPetCategoryList(petCategory);
    }

    /**
     * 通过ID查询宠物分类
     *
     * @param categoryId 分类ID
     * @return 宠物分类
     */
    @Override
    public PetCategory selectPetCategoryByCategoryId(Long categoryId)
    {
        return petCategoryMapper.selectPetCategoryByCategoryId(categoryId);
    }

    /**
     * 新增宠物分类
     *
     * @param petCategory 宠物分类
     * @return 结果
     */
    @Override
    public int insertPetCategory(PetCategory petCategory)
    {
        return petCategoryMapper.insertPetCategory(petCategory);
    }

    /**
     * 修改宠物分类
     *
     * @param petCategory 宠物分类
     * @return 结果
     */
    @Override
    public int updatePetCategory(PetCategory petCategory)
    {
        return petCategoryMapper.updatePetCategory(petCategory);
    }

    /**
     * 批量删除宠物分类
     *
     * @param categoryIds 需要删除的分类ID
     * @return 结果
     */
    @Override
    public int deletePetCategoryByCategoryIds(Long[] categoryIds)
    {
        return petCategoryMapper.deletePetCategoryByCategoryIds(categoryIds);
    }

    /**
     * 删除宠物分类
     *
     * @param categoryId 分类ID
     * @return 结果
     */
    @Override
    public int deletePetCategoryByCategoryId(Long categoryId)
    {
        return petCategoryMapper.deletePetCategoryByCategoryId(categoryId);
    }
}
