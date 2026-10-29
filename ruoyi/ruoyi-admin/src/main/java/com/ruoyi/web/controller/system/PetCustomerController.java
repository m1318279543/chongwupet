package com.ruoyi.web.controller.system;

import java.util.ArrayList;
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
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.service.IPetCustomerService;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 客户档案 Controller
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/customer")
public class PetCustomerController extends BaseController
{
    @Autowired
    private IPetCustomerService petCustomerService;

    @Autowired
    private IPetScopeService petScopeService;

    /** 客户列表 */
    @PreAuthorize("@ss.hasPermi('pet:customer:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetCustomer petCustomer)
    {
        // 非管理员只能看到本店客户
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            petCustomer.setStoreId(scope);
        }
        startPage();
        List<PetCustomer> list = petCustomerService.selectPetCustomerList(petCustomer);
        return getDataTable(list);
    }

    /** 客户详情（含名下宠物） */
    @PreAuthorize("@ss.hasPermi('pet:customer:list')")
    @GetMapping(value = "/{customerId}")
    public AjaxResult getInfo(@PathVariable("customerId") Long customerId)
    {
        PetCustomer customer = petCustomerService.selectPetCustomerByCustomerId(customerId);
        if (customer != null)
        {
            petScopeService.assertStoreAccessible(customer.getStoreId());
        }
        return success(customer);
    }

    /** 客户名下宠物 */
    @PreAuthorize("@ss.hasPermi('pet:customer:list')")
    @GetMapping(value = "/{customerId}/pets")
    public AjaxResult pets(@PathVariable("customerId") Long customerId)
    {
        PetCustomer customer = petCustomerService.selectPetCustomerByCustomerId(customerId);
        if (customer != null)
        {
            petScopeService.assertStoreAccessible(customer.getStoreId());
        }
        return success(petCustomerService.selectPetsByCustomerId(customerId));
    }

    /** 当前登录用户名下的宠物（前台「我的宠物」，无需后台权限） */
    @GetMapping("/myPets")
    public AjaxResult myPets()
    {
        Long userId = SecurityUtils.getUserId();
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        if (customer == null)
        {
            return success(new ArrayList<>());
        }
        return success(petCustomerService.selectPetsByCustomerId(customer.getCustomerId()));
    }

    /** 新增客户 */
    @PreAuthorize("@ss.hasPermi('pet:customer:add')")
    @Log(title = "客户档案", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetCustomer petCustomer)
    {
        // 店长新建的客户强制落在自己门店
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            if (scope < 0)
            {
                return error("当前账号未绑定门店，无法建档");
            }
            petCustomer.setStoreId(scope);
        }
        return toAjax(petCustomerService.insertPetCustomer(petCustomer));
    }

    /** 修改客户 */
    @PreAuthorize("@ss.hasPermi('pet:customer:edit')")
    @Log(title = "客户档案", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetCustomer petCustomer)
    {
        PetCustomer origin = petCustomerService.selectPetCustomerByCustomerId(petCustomer.getCustomerId());
        if (origin != null)
        {
            petScopeService.assertStoreAccessible(origin.getStoreId());
        }
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            petCustomer.setStoreId(scope);
        }
        return toAjax(petCustomerService.updatePetCustomer(petCustomer));
    }

    /** 删除客户 */
    @PreAuthorize("@ss.hasPermi('pet:customer:remove')")
    @Log(title = "客户档案", businessType = BusinessType.DELETE)
    @DeleteMapping("/{customerIds}")
    public AjaxResult remove(@PathVariable Long[] customerIds)
    {
        return toAjax(petCustomerService.deletePetCustomerByCustomerIds(customerIds));
    }
}
