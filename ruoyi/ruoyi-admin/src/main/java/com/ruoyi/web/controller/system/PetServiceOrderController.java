package com.ruoyi.web.controller.system;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
import com.ruoyi.system.domain.PetServiceOrder;
import com.ruoyi.system.service.IPetNotificationService;
import com.ruoyi.system.service.IPetScopeService;
import com.ruoyi.system.service.IPetServiceOrderService;

/**
 * 服务工单 Controller
 *
 * 前台：客户只能看自己的工单、只能评价。
 * 后台：店长按门店看，接单/开始/完成/取消都要对应权限位。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/service/order")
public class PetServiceOrderController extends BaseController
{
    @Autowired
    private IPetServiceOrderService petServiceOrderService;

    @Autowired
    private IPetScopeService petScopeService;

    @Autowired
    private IPetNotificationService petNotificationService;

    private static String statusText(String status)
    {
        switch (status == null ? "" : status)
        {
            case "1": return "已接单";
            case "2": return "服务中";
            case "3": return "已完成";
            case "4": return "已取消";
            case "5": return "爽约";
            default: return "待接单";
        }
    }

    /** 后台工单列表 */
    @PreAuthorize("@ss.hasPermi('pet:service:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetServiceOrder order)
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
        return getDataTable(petServiceOrderService.selectPetServiceOrderList(order));
    }

    /** 客户自己的工单（前台"我的预约/服务"用） */
    @GetMapping("/mine")
    public AjaxResult mine()
    {
        PetServiceOrder query = new PetServiceOrder();
        query.setUserId(SecurityUtils.getUserId());
        List<PetServiceOrder> list = petServiceOrderService.selectPetServiceOrderList(query);
        return success(list);
    }

    /** 今日经营概览 */
    @PreAuthorize("@ss.hasPermi('pet:service:list')")
    @GetMapping("/stats")
    public AjaxResult stats()
    {
        Long scope = petScopeService.currentStoreId();
        return success(petServiceOrderService.selectTodayStats(scope != null && scope > 0 ? scope : null));
    }

    /** 工单详情 + 流转记录 */
    @PreAuthorize("@ss.hasPermi('pet:service:list')")
    @GetMapping("/{serviceId}")
    public AjaxResult getInfo(@PathVariable("serviceId") Long serviceId)
    {
        PetServiceOrder order = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (order == null)
        {
            return error("工单不存在");
        }
        petScopeService.assertStoreAccessible(order.getStoreId());
        AjaxResult ajax = success(order);
        ajax.put("logs", petServiceOrderService.selectLogs(serviceId));
        return ajax;
    }

    /** 派工/接单 */
    @PreAuthorize("@ss.hasPermi('pet:service:dispatch')")
    @Log(title = "服务工单", businessType = BusinessType.UPDATE)
    @PutMapping("/dispatch/{serviceId}")
    public AjaxResult dispatch(@PathVariable("serviceId") Long serviceId, @RequestBody PetServiceOrder body)
    {
        PetServiceOrder origin = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (origin == null)
        {
            return error("工单不存在");
        }
        petScopeService.assertStoreAccessible(origin.getStoreId());
        int rows = petServiceOrderService.dispatch(serviceId, body.getStaffId(), body.getStaffName(), SecurityUtils.getUsername());
        if (rows > 0 && origin.getUserId() != null)
        {
            petNotificationService.push(origin.getUserId(), null, "service", "服务工单已接单",
                    "工单「" + origin.getServiceNo() + "」已分配给" + (body.getStaffName() == null ? "门店员工" : body.getStaffName())
                            + "，请按约定时间到店。", serviceId);
        }
        return toAjax(rows);
    }

    /** 开始服务 */
    @PreAuthorize("@ss.hasPermi('pet:service:dispatch')")
    @Log(title = "服务工单", businessType = BusinessType.UPDATE)
    @PutMapping("/start/{serviceId}")
    public AjaxResult start(@PathVariable("serviceId") Long serviceId)
    {
        PetServiceOrder origin = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (origin == null)
        {
            return error("工单不存在");
        }
        petScopeService.assertStoreAccessible(origin.getStoreId());
        return toAjax(petServiceOrderService.start(serviceId, SecurityUtils.getUsername()));
    }

    /** 完成服务 */
    @PreAuthorize("@ss.hasPermi('pet:service:finish')")
    @Log(title = "服务工单", businessType = BusinessType.UPDATE)
    @PutMapping("/finish/{serviceId}")
    public AjaxResult finish(@PathVariable("serviceId") Long serviceId,
                             @RequestParam(value = "remark", required = false) String remark)
    {
        PetServiceOrder origin = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (origin == null)
        {
            return error("工单不存在");
        }
        petScopeService.assertStoreAccessible(origin.getStoreId());
        int rows = petServiceOrderService.finish(serviceId, SecurityUtils.getUsername(), remark);
        if (rows > 0 && origin.getUserId() != null)
        {
            petNotificationService.push(origin.getUserId(), null, "service", "服务已完成",
                    "工单「" + origin.getServiceNo() + "」已完成，欢迎回来给个评价。", serviceId);
        }
        return toAjax(rows);
    }

    /** 取消工单 */
    @PreAuthorize("@ss.hasPermi('pet:service:cancel')")
    @Log(title = "服务工单", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{serviceId}")
    public AjaxResult cancel(@PathVariable("serviceId") Long serviceId,
                             @RequestParam(value = "reason", required = false) String reason)
    {
        PetServiceOrder origin = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (origin == null)
        {
            return error("工单不存在");
        }
        petScopeService.assertStoreAccessible(origin.getStoreId());
        int rows = petServiceOrderService.cancel(serviceId, SecurityUtils.getUsername(), reason);
        if (rows > 0 && origin.getUserId() != null)
        {
            petNotificationService.push(origin.getUserId(), null, "service", "服务工单已取消",
                    "工单「" + origin.getServiceNo() + "」已取消" + (StringUtils.isNotBlank(reason) ? "，原因：" + reason : "") + "。", serviceId);
        }
        return toAjax(rows);
    }

    /** 客户评价：只能评价自己的已完成工单 */
    @PostMapping("/evaluate/{serviceId}")
    public AjaxResult evaluate(@PathVariable("serviceId") Long serviceId, @RequestBody PetServiceOrder body)
    {
        PetServiceOrder origin = petServiceOrderService.selectPetServiceOrderById(serviceId);
        if (origin == null)
        {
            return error("工单不存在");
        }
        if (!SecurityUtils.isAdmin() && (origin.getUserId() == null || !origin.getUserId().equals(SecurityUtils.getUserId())))
        {
            return error("只能评价自己的服务工单");
        }
        return toAjax(petServiceOrderService.evaluate(serviceId, body.getScore(), body.getComment()));
    }

    /** 删除工单（逻辑删除） */
    @PreAuthorize("@ss.hasPermi('pet:service:cancel')")
    @Log(title = "服务工单", businessType = BusinessType.DELETE)
    @DeleteMapping("/{serviceIds}")
    public AjaxResult remove(@PathVariable Long[] serviceIds)
    {
        for (Long serviceId : serviceIds)
        {
            PetServiceOrder order = petServiceOrderService.selectPetServiceOrderById(serviceId);
            if (order != null)
            {
                petScopeService.assertStoreAccessible(order.getStoreId());
            }
        }
        return toAjax(petServiceOrderService.deletePetServiceOrderByIds(serviceIds));
    }
}
