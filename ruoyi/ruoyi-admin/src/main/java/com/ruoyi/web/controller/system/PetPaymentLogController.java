package com.ruoyi.web.controller.system;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetPaymentLog;
import com.ruoyi.system.service.IPetPaymentLogService;

/**
 * 支付流水 Controller
 *
 * 每次支付尝试（成功/失败）都会写入 pet_payment_log；
 * 后台「支付流水」页可查看明细，「购物车管理」页顶部展示订单维度总览。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/payment")
public class PetPaymentLogController extends BaseController
{
    @Autowired
    private IPetPaymentLogService paymentLogService;

    /** 支付流水列表 */
    @PreAuthorize("@ss.hasPermi('pet:payment:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetPaymentLog paymentLog)
    {
        startPage();
        List<PetPaymentLog> list = paymentLogService.selectPaymentLogList(paymentLog);
        return getDataTable(list);
    }

    /** 导出支付流水 */
    @PreAuthorize("@ss.hasPermi('pet:payment:export')")
    @Log(title = "支付流水", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetPaymentLog paymentLog)
    {
        List<PetPaymentLog> list = paymentLogService.selectPaymentLogList(paymentLog);
        ExcelUtil<PetPaymentLog> util = new ExcelUtil<PetPaymentLog>(PetPaymentLog.class);
        util.exportExcel(response, list, "支付流水");
    }

    /** 订单维度总览：已支付/待支付/支付失败/已取消 */
    @PreAuthorize("@ss.hasPermi('pet:payment:list')")
    @GetMapping("/overview")
    public AjaxResult overview()
    {
        return AjaxResult.success(paymentLogService.selectOrderOverview());
    }

    /** 近 N 天支付趋势（默认 7 天） */
    @PreAuthorize("@ss.hasPermi('pet:payment:list')")
    @GetMapping("/trend")
    public AjaxResult trend(@RequestParam(value = "days", defaultValue = "7") Integer days)
    {
        Map<String, Object> data = new HashMap<>();
        data.put("days", days);
        data.put("items", paymentLogService.selectDailyTrend(days));
        return AjaxResult.success(data);
    }
}
