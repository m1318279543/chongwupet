package com.ruoyi.web.controller.system;

import java.util.Map;
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
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetRefund;
import com.ruoyi.system.service.IPetRefundService;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 退款 Controller
 *
 * 前台：对自己的已支付订单申请退款、查看进度。
 * 后台：按门店看退款单，同意则退款并回补库存，拒绝需填意见。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/refund")
public class PetRefundController extends BaseController
{
    @Autowired
    private IPetRefundService petRefundService;

    @Autowired
    private IPetScopeService petScopeService;

    /** 后台退款单列表 */
    @PreAuthorize("@ss.hasPermi('pet:refund:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetRefund refund)
    {
        Long scope = petScopeService.currentStoreId();
        if (scope != null)
        {
            if (scope < 0)
            {
                return getDataTable(java.util.Collections.emptyList());
            }
            refund.setStoreId(scope);
        }
        startPage();
        return getDataTable(petRefundService.selectPetRefundList(refund));
    }

    /** 我的退款记录（前台） */
    @GetMapping("/mine")
    public AjaxResult mine()
    {
        return success(petRefundService.selectMyRefunds(SecurityUtils.getUserId()));
    }

    /** 今日概览 */
    @PreAuthorize("@ss.hasPermi('pet:refund:list')")
    @GetMapping("/stats")
    public AjaxResult stats()
    {
        Long scope = petScopeService.currentStoreId();
        return success(petRefundService.selectTodayStats(scope != null && scope > 0 ? scope : null));
    }

    /** 申请退款（前台） */
    @Log(title = "申请退款", businessType = BusinessType.INSERT)
    @PostMapping("/apply")
    public AjaxResult apply(@RequestBody Map<String, Object> body)
    {
        String orderNo = body == null || body.get("orderNo") == null ? null : String.valueOf(body.get("orderNo"));
        String reason = body == null || body.get("reason") == null ? null : String.valueOf(body.get("reason"));
        PetRefund refund = petRefundService.apply(orderNo, reason, SecurityUtils.getUserId(), getUsername());
        return AjaxResult.success("退款申请已提交，等待门店审核", refund);
    }

    /** 审核（后台）：pass=true 同意退款，false 拒绝 */
    @PreAuthorize("@ss.hasPermi('pet:refund:audit')")
    @Log(title = "退款审核", businessType = BusinessType.UPDATE)
    @PutMapping("/audit/{refundId}")
    public AjaxResult audit(@PathVariable("refundId") Long refundId, @RequestBody(required = false) Map<String, Object> body)
    {
        PetRefund refund = petRefundService.selectPetRefundById(refundId);
        if (refund == null)
        {
            return error("退款单不存在");
        }
        petScopeService.assertStoreAccessible(refund.getStoreId());
        boolean pass = body != null && Boolean.parseBoolean(String.valueOf(body.get("pass")));
        String remark = body == null || body.get("remark") == null ? null : String.valueOf(body.get("remark"));
        petRefundService.audit(refundId, pass, remark, getUsername());
        return success(pass ? "已同意退款，库存已退还" : "已拒绝该退款申请");
    }
}
