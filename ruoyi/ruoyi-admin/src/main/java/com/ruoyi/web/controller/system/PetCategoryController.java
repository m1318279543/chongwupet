package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetCategory;
import com.ruoyi.system.service.IPetCategoryService;

/**
 * 宠物分类 Controller
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/category")
public class PetCategoryController extends BaseController
{
    @Autowired
    private IPetCategoryService petCategoryService;

    /**
     * 查询宠物分类列表
     */
    @GetMapping("/list")
    public TableDataInfo list(PetCategory petCategory)
    {
        startPage();
        List<PetCategory> list = petCategoryService.selectPetCategoryList(petCategory);
        return getDataTable(list);
    }

    /**
     * 导出宠物分类列表
     */
    @PreAuthorize("@ss.hasPermi('pet:category:export')")
    @Log(title = "宠物分类", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetCategory petCategory)
    {
        List<PetCategory> list = petCategoryService.selectPetCategoryList(petCategory);
        ExcelUtil<PetCategory> util = new ExcelUtil<PetCategory>(PetCategory.class);
        util.exportExcel(response, list, "宠物分类数据");
    }

    /**
     * 获取宠物分类详细信息
     */
    @PreAuthorize("@ss.hasPermi('pet:category:query')")
    @GetMapping(value = "/{categoryId}")
    public AjaxResult getInfo(@PathVariable("categoryId") Long categoryId)
    {
        return success(petCategoryService.selectPetCategoryByCategoryId(categoryId));
    }

    /**
     * 新增宠物分类
     */
    @PreAuthorize("@ss.hasPermi('pet:category:add')")
    @Log(title = "宠物分类", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetCategory petCategory)
    {
        return toAjax(petCategoryService.insertPetCategory(petCategory));
    }

    /**
     * 修改宠物分类
     */
    @PreAuthorize("@ss.hasPermi('pet:category:edit')")
    @Log(title = "宠物分类", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetCategory petCategory)
    {
        return toAjax(petCategoryService.updatePetCategory(petCategory));
    }

    /**
     * 删除宠物分类
     */
    @PreAuthorize("@ss.hasPermi('pet:category:remove')")
    @Log(title = "宠物分类", businessType = BusinessType.DELETE)
    @DeleteMapping("/{categoryIds}")
    public AjaxResult remove(@PathVariable Long[] categoryIds)
    {
        return toAjax(petCategoryService.deletePetCategoryByCategoryIds(categoryIds));
    }
}
