package com.ruoyi.web.controller.system;

import java.util.List;
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
import com.ruoyi.system.domain.PetServiceItem;
import com.ruoyi.system.service.IPetScopeService;
import com.ruoyi.system.service.IPetServiceItemService;

/**
 * 服务项目 Controller
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/service/item")
public class PetServiceItemController extends BaseController
{
    @Autowired
    private IPetServiceItemService petServiceItemService;

    @Autowired
    private IPetScopeService petScopeService;

    /** 项目列表 */
    @PreAuthorize("@ss.hasPermi('pet:serviceitem:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetServiceItem item)
    {
        Long scope = petScopeService.currentStoreId();
        if (scope != null && scope > 0)
        {
            item.setStoreId(scope);
        }
        startPage();
        return getDataTable(petServiceItemService.selectPetServiceItemList(item));
    }

    /** 项目下拉（登录即可，前台展示价目/后台开单） */
    @GetMapping("/options")
    public AjaxResult options()
    {
        PetServiceItem query = new PetServiceItem();
        query.setStatus("0");
        Long scope = petScopeService.currentStoreId();
        if (scope != null && scope > 0)
        {
            query.setStoreId(scope);
        }
        return success(petServiceItemService.selectPetServiceItemList(query));
    }

    /** 项目详情 */
    @PreAuthorize("@ss.hasPermi('pet:serviceitem:list')")
    @GetMapping("/{itemId}")
    public AjaxResult getInfo(@PathVariable("itemId") Long itemId)
    {
        return success(petServiceItemService.selectPetServiceItemById(itemId));
    }

    /** 新增项目 */
    @PreAuthorize("@ss.hasPermi('pet:serviceitem:edit')")
    @Log(title = "服务项目", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetServiceItem item)
    {
        item.setCreateBy(getUsername());
        return toAjax(petServiceItemService.insertPetServiceItem(item));
    }

    /** 修改项目 */
    @PreAuthorize("@ss.hasPermi('pet:serviceitem:edit')")
    @Log(title = "服务项目", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetServiceItem item)
    {
        item.setUpdateBy(getUsername());
        return toAjax(petServiceItemService.updatePetServiceItem(item));
    }

    /** 删除项目 */
    @PreAuthorize("@ss.hasPermi('pet:serviceitem:edit')")
    @Log(title = "服务项目", businessType = BusinessType.DELETE)
    @DeleteMapping("/{itemIds}")
    public AjaxResult remove(@PathVariable Long[] itemIds)
    {
        return toAjax(petServiceItemService.deletePetServiceItemByIds(itemIds));
    }
}
