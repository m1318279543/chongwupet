package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetCategory;

/**
 * 宠物分类 服务层
 *
 * @author ruoyi
 */
public interface IPetCategoryService
{
    /**
     * 查询宠物分类列表
     *
     * @param petCategory 宠物分类
     * @return 宠物分类集合
     */
    public List<PetCategory> selectPetCategoryList(PetCategory petCategory);

    /**
     * 通过ID查询宠物分类
     *
     * @param categoryId 分类ID
     * @return 宠物分类
     */
    public PetCategory selectPetCategoryByCategoryId(Long categoryId);

    /**
     * 新增宠物分类
     *
     * @param petCategory 宠物分类
     * @return 结果
     */
    public int insertPetCategory(PetCategory petCategory);

    /**
     * 修改宠物分类
     *
     * @param petCategory 宠物分类
     * @return 结果
     */
    public int updatePetCategory(PetCategory petCategory);

    /**
     * 批量删除宠物分类
     *
     * @param categoryIds 需要删除的分类ID
     * @return 结果
     */
    public int deletePetCategoryByCategoryIds(Long[] categoryIds);

    /**
     * 删除宠物分类
     *
     * @param categoryId 分类ID
     * @return 结果
     */
    public int deletePetCategoryByCategoryId(Long categoryId);
}
