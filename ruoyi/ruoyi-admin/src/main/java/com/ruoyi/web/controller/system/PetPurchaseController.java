package com.ruoyi.web.controller.system;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
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
import com.ruoyi.system.domain.PetPurchase;
import com.ruoyi.system.service.IPetPurchaseService;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 采购单 Controller
 *
 * 后台专用：建单 → 入库（加库存）→ 取消。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/purchase")
public class PetPurchaseController extends BaseController
{
    @Autowired
    private IPetPurchaseService petPurchaseService;

    @Autowired
    private IPetScopeService petScopeService;

    @PreAuthorize("@ss.hasPermi('pet:purchase:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetPurchase purchase)
    {
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            if (scope < 0)
            {
                return getDataTable(java.util.Collections.emptyList());
            }
            purchase.setStoreId(scope);
        }
        startPage();
        return getDataTable(petPurchaseService.selectPetPurchaseList(purchase));
    }

    @PreAuthorize("@ss.hasPermi('pet:purchase:list')")
    @GetMapping("/stats")
    public AjaxResult stats()
    {
        Long scope = petScopeService.currentStoreId();
        return success(petPurchaseService.selectTodayStats(scope != null && scope > 0 ? scope : null));
    }

    @PreAuthorize("@ss.hasPermi('pet:purchase:list')")
    @GetMapping("/{purchaseNo}")
    public AjaxResult getInfo(@PathVariable("purchaseNo") String purchaseNo)
    {
        PetPurchase purchase = petPurchaseService.selectPetPurchaseByNo(purchaseNo);
        if (purchase == null)
        {
            return error("采购单不存在");
        }
        petScopeService.assertStoreAccessible(purchase.getStoreId());
        return success(purchase);
    }

    @PreAuthorize("@ss.hasPermi('pet:purchase:list')")
    @Log(title = "采购单", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetPurchase purchase)
    {
        Long scope = petScopeService.currentStoreId();
        if (purchase.getStoreId() == null && scope != null && scope > 0)
        {
            purchase.setStoreId(scope);
        }
        PetPurchase created = petPurchaseService.createPurchase(purchase, getUsername());
        return AjaxResult.success("采购单已创建，等待入库", created);
    }

    @PreAuthorize("@ss.hasPermi('pet:purchase:inbound')")
    @Log(title = "采购入库", businessType = BusinessType.UPDATE)
    @PutMapping("/inbound/{purchaseNo}")
    public AjaxResult inbound(@PathVariable("purchaseNo") String purchaseNo)
    {
        PetPurchase purchase = petPurchaseService.selectPetPurchaseByNo(purchaseNo);
        if (purchase == null)
        {
            return error("采购单不存在");
        }
        petScopeService.assertStoreAccessible(purchase.getStoreId());
        petPurchaseService.inbound(purchaseNo, getUsername());
        return success("入库完成，库存已增加");
    }

    @PreAuthorize("@ss.hasPermi('pet:purchase:list')")
    @Log(title = "采购取消", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{purchaseNo}")
    public AjaxResult cancel(@PathVariable("purchaseNo") String purchaseNo)
    {
        PetPurchase purchase = petPurchaseService.selectPetPurchaseByNo(purchaseNo);
        if (purchase == null)
        {
            return error("采购单不存在");
        }
        petScopeService.assertStoreAccessible(purchase.getStoreId());
        petPurchaseService.cancel(purchaseNo, getUsername());
        return success("采购单已取消");
    }
}
