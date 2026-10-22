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
import com.ruoyi.system.domain.PetStaff;
import com.ruoyi.system.domain.PetStore;
import com.ruoyi.system.service.IPetScopeService;
import com.ruoyi.system.service.IPetStoreService;

/**
 * 门店管理 Controller
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/store")
public class PetStoreController extends BaseController
{
    @Autowired
    private IPetStoreService petStoreService;

    @Autowired
    private IPetScopeService petScopeService;

    /** 门店列表 */
    @PreAuthorize("@ss.hasPermi('pet:store:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetStore petStore)
    {
        // 非管理员只能看到自己所属门店
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            petStore.setStoreId(scope);
        }
        startPage();
        List<PetStore> list = petStoreService.selectPetStoreList(petStore);
        return getDataTable(list);
    }

    /** 门店下拉选项（供预约、下单、首页门店展示等场景选择门店，游客可读） */
    @GetMapping("/options")
    public AjaxResult options()
    {
        PetStore query = new PetStore();
        query.setStatus("0");
        // 店长只能选到自己门店；游客/无归属账号 currentStoreId() 返回 -1，不能当作筛选条件
        Long scope = petScopeService.currentStoreId();
        if (scope != null && scope > 0)
        {
            query.setStoreId(scope);
        }
        return success(petStoreService.selectPetStoreList(query));
    }

    /** 门店详情 */
    @PreAuthorize("@ss.hasPermi('pet:store:list')")
    @GetMapping(value = "/{storeId}")
    public AjaxResult getInfo(@PathVariable("storeId") Long storeId)
    {
        petScopeService.assertStoreAccessible(storeId);
        return success(petStoreService.selectPetStoreByStoreId(storeId));
    }

    /** 门店在职员工 */
    @PreAuthorize("@ss.hasPermi('pet:store:list')")
    @GetMapping(value = "/{storeId}/staff")
    public AjaxResult staff(@PathVariable("storeId") Long storeId)
    {
        petScopeService.assertStoreAccessible(storeId);
        List<PetStaff> list = petStoreService.selectStaffByStoreId(storeId);
        return success(list);
    }

    /** 新增门店 */
    @PreAuthorize("@ss.hasPermi('pet:store:add')")
    @Log(title = "门店管理", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetStore petStore)
    {
        return toAjax(petStoreService.insertPetStore(petStore));
    }

    /** 修改门店 */
    @PreAuthorize("@ss.hasPermi('pet:store:edit')")
    @Log(title = "门店管理", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetStore petStore)
    {
        petScopeService.assertStoreAccessible(petStore.getStoreId());
        return toAjax(petStoreService.updatePetStore(petStore));
    }

    /** 删除门店 */
    @PreAuthorize("@ss.hasPermi('pet:store:remove')")
    @Log(title = "门店管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{storeIds}")
    public AjaxResult remove(@PathVariable Long[] storeIds)
    {
        for (Long storeId : storeIds)
        {
            petScopeService.assertStoreAccessible(storeId);
        }
        return toAjax(petStoreService.deletePetStoreByStoreIds(storeIds));
    }
}
