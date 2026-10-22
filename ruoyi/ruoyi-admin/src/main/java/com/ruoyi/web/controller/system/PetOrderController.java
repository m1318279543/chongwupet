package com.ruoyi.web.controller.system;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.service.IPetOrderService;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 订单 Controller
 *
 * 前台：只能看自己的订单，能支付、能取消未支付订单。
 * 后台：按门店看，能发货、能代客取消。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/order")
public class PetOrderController extends BaseController
{
    @Autowired
    private IPetOrderService petOrderService;

    @Autowired
    private IPetScopeService petScopeService;

    /** 后台订单列表 */
    @PreAuthorize("@ss.hasPermi('pet:order:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetOrder order)
    {
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            if (scope < 0)
            {
                return getDataTable(java.util.Collections.emptyList());
            }
            order.setStoreId(scope);
        }
        startPage();
        return getDataTable(petOrderService.selectPetOrderList(order));
    }

    /** 我的订单（前台） */
    @GetMapping("/mine")
    public AjaxResult mine()
    {
        return success(petOrderService.selectMyOrders(SecurityUtils.getUserId()));
    }

    /**
     * 宠物下单（前台）
     *
     * 一只一单：下单即把 pet_info.status 由「在售」改成「已售」，
     * 改不动说明刚被别人订走；取消订单会自动放回在售。
     */
    @Log(title = "宠物下单", businessType = BusinessType.INSERT)
    @PostMapping("/pet/{petId}")
    public AjaxResult createPetOrder(@PathVariable("petId") Long petId)
    {
        PetOrder order = petOrderService.createPetOrder(petId, SecurityUtils.getUserId(), getUsername());
        Map<String, Object> data = new HashMap<>();
        data.put("orderNo", order.getOrderNo());
        data.put("total", order.getPayAmount());
        return AjaxResult.success("下单成功，请完成支付", data);
    }

    /** 今日订单概览 */
    @PreAuthorize("@ss.hasPermi('pet:order:list')")
    @GetMapping("/stats")
    public AjaxResult stats()
    {
        Long scope = petScopeService.currentStoreId();
        return success(petOrderService.selectTodayStats(scope != null && scope > 0 ? scope : null));
    }

    /** 订单详情（含明细） */
    @GetMapping("/{orderNo}")
    public AjaxResult getInfo(@PathVariable("orderNo") String orderNo)
    {
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            return error("订单不存在");
        }
        if (!canAccess(order))
        {
            return error("没有权限查看该订单");
        }
        return success(order);
    }

    /** 支付（幂等） */
    @Log(title = "订单支付", businessType = BusinessType.UPDATE)
    @PostMapping("/pay/{orderNo}")
    public AjaxResult pay(@PathVariable("orderNo") String orderNo,
                          @RequestParam(value = "payMethod", required = false) String payMethod)
    {
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            return error("订单不存在");
        }
        if (!canAccess(order))
        {
            return error("没有权限支付该订单");
        }
        int rows = petOrderService.payOrder(orderNo, payMethod, getUsername());
        return success(rows == 0 ? "订单已支付，无需重复支付" : "支付成功");
    }

    /** 取消订单 */
    @Log(title = "订单取消", businessType = BusinessType.UPDATE)
    @PostMapping("/cancel/{orderNo}")
    public AjaxResult cancel(@PathVariable("orderNo") String orderNo,
                             @RequestParam(value = "reason", required = false) String reason)
    {
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            return error("订单不存在");
        }
        if (!canAccess(order))
        {
            return error("没有权限取消该订单");
        }
        boolean isOwner = order.getUserId() != null && order.getUserId().equals(SecurityUtils.getUserId());
        if (isOwner && !SecurityUtils.isAdmin() && "1".equals(order.getPayStatus()))
        {
            return error("已支付订单请联系门店处理退款");
        }
        petOrderService.cancelOrder(orderNo, reason, getUsername());
        return success("订单已取消");
    }

    /** 发货 / 完成 */
    @PreAuthorize("@ss.hasPermi('pet:order:ship')")
    @Log(title = "订单发货", businessType = BusinessType.UPDATE)
    @PutMapping("/ship/{orderNo}")
    public AjaxResult ship(@PathVariable("orderNo") String orderNo)
    {
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            return error("订单不存在");
        }
        petScopeService.assertStoreAccessible(order.getStoreId());
        return toAjax(petOrderService.shipOrder(orderNo, getUsername()));
    }

    /** 删除订单（逻辑删除） */
    @PreAuthorize("@ss.hasPermi('pet:order:cancel')")
    @Log(title = "订单管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{orderNos}")
    public AjaxResult remove(@PathVariable String[] orderNos)
    {
        return toAjax(petOrderService.deletePetOrderByNos(orderNos));
    }

    /** 本人 或 门店员工 可以访问 */
    private boolean canAccess(PetOrder order)
    {
        if (SecurityUtils.isAdmin())
        {
            return true;
        }
        if (order.getUserId() != null && order.getUserId().equals(SecurityUtils.getUserId()))
        {
            return true;
        }
        Long scope = petScopeService.currentStoreId();
        return scope != null && scope > 0 && StringUtils.isNotNull(order.getStoreId()) && scope.equals(order.getStoreId());
    }
}
