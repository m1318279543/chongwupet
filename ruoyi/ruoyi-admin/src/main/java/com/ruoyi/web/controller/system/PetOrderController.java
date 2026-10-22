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
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.domain.PetOrderItem;
import com.ruoyi.system.domain.PetPaymentLog;
import com.ruoyi.system.service.IPetNotificationService;
import com.ruoyi.system.service.IPetOrderService;
import com.ruoyi.system.service.IPetPaymentLogService;
import com.ruoyi.system.service.IPetScopeService;
import com.ruoyi.system.service.IPetWalletService;
import java.math.BigDecimal;
import java.math.RoundingMode;

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

    @Autowired
    private IPetPaymentLogService paymentLogService;

    @Autowired
    private IPetWalletService walletService;

    @Autowired
    private IPetNotificationService petNotificationService;

    /** 失败原因限长，避免超出 reason 字段（255） */
    private String shorten(String s2)
    {
        if (s2 == null) return null;
        return s2.length() > 240 ? s2.substring(0, 240) : s2;
    }

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

    /**
     * 支付（幂等）。平台余额通道真实校验并扣减余额，不足则直接失败；
     * 无论成功失败都写 pet_payment_log 流水，供后台支付管理与数据看板统计。
     */
    @Log(title = "订单支付", businessType = BusinessType.UPDATE)
    @PostMapping("/pay/{orderNo}")
    public AjaxResult pay(@PathVariable("orderNo") String orderNo,
                          @RequestParam(value = "payMethod", required = false) String payMethod)
    {
        String method2 = StringUtils.isBlank(payMethod) ? "alipay" : payMethod;
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            return error("订单不存在");
        }
        if (!canAccess(order))
        {
            return error("没有权限支付该订单");
        }

        StringBuilder names = new StringBuilder();
        for (PetOrderItem item : order.getItems())
        {
            if (names.length() > 0) names.append("、");
            names.append(item.getGoodsName());
        }
        double total = order.getPayAmount() == null ? 0 : order.getPayAmount().doubleValue();

        PetPaymentLog pl = new PetPaymentLog();
        pl.setOrderNo(orderNo);
        pl.setUserId(SecurityUtils.getUserId());
        pl.setUserName(getUsername());
        pl.setPayMethod(method2);
        pl.setAmount(total);
        pl.setItems(order.getItemCount() == null
                ? (order.getItems() == null ? 0 : order.getItems().size())
                : order.getItemCount());

        // 平台余额通道：真实校验并扣减余额，不足则直接失败（后台能看到真实原因与可用余额）
        boolean isBalance = "balance".equals(method2);
        BigDecimal payAmount = BigDecimal.valueOf(total).setScale(2, RoundingMode.HALF_UP);
        boolean deducted = false;
        if (isBalance && total > 0)
        {
            deducted = walletService.tryDeduct(SecurityUtils.getUserId(), payAmount);
            if (!deducted)
            {
                BigDecimal bal = walletService.getBalance(SecurityUtils.getUserId());
                String reason = String.format("余额不足（可用 ¥%.2f，本单需 ¥%.2f）", bal.doubleValue(), total);
                pl.setResult("fail");
                pl.setReason(shorten(reason));
                paymentLogService.record(pl);
                return error(reason);
            }
        }

        int rows;
        try
        {
            rows = petOrderService.payOrder(orderNo, method2, getUsername());
        }
        catch (Exception e)
        {
            if (deducted) walletService.refund(SecurityUtils.getUserId(), payAmount);
            pl.setResult("fail");
            pl.setReason(shorten("支付异常：" + e.getMessage()));
            paymentLogService.record(pl);
            throw e;
        }

        String methodCn = "wechat".equals(method2) ? "微信支付" : "balance".equals(method2) ? "余额支付" : "支付宝";

        if (rows == 0)
        {
            if (deducted) walletService.refund(SecurityUtils.getUserId(), payAmount);
            pl.setResult("fail");
            pl.setReason("订单不可支付（已支付或已取消）");
            paymentLogService.record(pl);
            return success("订单已支付，无需重复支付");
        }

        // 汇总本单信息写通知
        petNotificationService.push(order.getUserId(), order.getUserName(), "order",
                "订单支付成功",
                "订单 " + orderNo + " 已通过" + methodCn + "支付成功，共 ¥" + order.getPayAmount()
                        + "（" + names + "），我们会尽快为你安排发货。",
                order.getOrderId());

        pl.setResult("success");
        if (isBalance)
        {
            BigDecimal after = walletService.getBalance(SecurityUtils.getUserId());
            pl.setReason(shorten(String.format("通过平台余额支付成功，余额 ¥%.2f", after.doubleValue())));
        }
        else
        {
            pl.setReason("通过" + methodCn + "支付成功");
        }
        paymentLogService.record(pl);
        return success("支付成功");
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
