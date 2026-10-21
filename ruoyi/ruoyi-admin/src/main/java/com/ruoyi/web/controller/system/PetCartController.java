package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetPaymentLog;
import com.ruoyi.system.service.IPetNotificationService;
import com.ruoyi.system.service.IPetPaymentLogService;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import com.ruoyi.system.domain.PetCart;
import com.ruoyi.system.service.IPetCartService;

/**
 * 购物车管理 Controller
 *
 * 权限说明：前台登录用户在结算时把选中的商品提交（写入 pet_cart）；
 * 后台管理员可查看全部购物车/订单记录并删除。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/cart")
public class PetCartController extends BaseController
{
    @Autowired
    private IPetCartService petCartService;

    @Autowired
    private IPetNotificationService petNotificationService;

    @Autowired
    private IPetPaymentLogService paymentLogService;

    /** 生成订单号：ORD + 时间戳 + 3 位随机数 */
    private static String genOrderNo()
    {
        return "ORD" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"))
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }

    /**
     * 查询购物车列表：管理员看全部，普通用户只看自己的
     */
    @GetMapping("/list")
    public TableDataInfo list(PetCart petCart)
    {
        if (!SecurityUtils.isAdmin())
        {
            petCart.setUserId(SecurityUtils.getUserId());
        }
        startPage();
        List<PetCart> list = petCartService.selectPetCartList(petCart);
        return getDataTable(list);
    }

    @PreAuthorize("@ss.hasPermi('pet:cart:export')")
    @Log(title = "购物车管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetCart petCart)
    {
        if (!SecurityUtils.isAdmin())
        {
            petCart.setUserId(SecurityUtils.getUserId());
        }
        List<PetCart> list = petCartService.selectPetCartList(petCart);
        ExcelUtil<PetCart> util = new ExcelUtil<PetCart>(PetCart.class);
        util.exportExcel(response, list, "购物车数据");
    }

    /**
     * 结算提交：登录用户把选中的商品写入购物车/订单快照
     */
    @Log(title = "购物车管理", businessType = BusinessType.INSERT)
    @PostMapping("/submit")
    public AjaxResult submit(@RequestBody List<PetCart> items)
    {
        if (items == null || items.isEmpty())
        {
            return error("购物车为空，无法提交");
        }
        Long userId = SecurityUtils.getUserId();
        String userName = SecurityUtils.getUsername();
        String orderNo = genOrderNo();
        int count = 0;
        double total = 0;
        for (PetCart item : items)
        {
            item.setCartId(null);
            item.setUserId(userId);
            item.setUserName(userName);
            item.setOrderNo(orderNo);
            item.setPayStatus("0");
            if (item.getQty() == null || item.getQty() < 1) item.setQty(1);
            if (item.getPrice() != null && item.getQty() != null)
            {
                item.setAmount(item.getPrice() * item.getQty());
                total += item.getAmount();
            }
            count += petCartService.insertPetCart(item);
        }
        Map<String, Object> data = new HashMap<>();
        data.put("orderNo", orderNo);
        data.put("count", count);
        data.put("total", Math.round(total * 100) / 100.0);
        AjaxResult ok = AjaxResult.success("下单成功，待支付", data);
        return ok;
    }

    /**
     * 模拟支付：按订单号支付当前用户名下待支付订单，成功后写站内通知。
     * 无论成功还是失败，都会往 pet_payment_log 写一条流水，后台可据此查看支付结果。
     */
    @Log(title = "订单支付", businessType = BusinessType.UPDATE)
    @PostMapping("/pay/{orderNo}")
    public AjaxResult pay(@PathVariable("orderNo") String orderNo,
                          @RequestBody(required = false) Map<String, Object> body)
    {
        String payMethod = body == null || body.get("payMethod") == null ? "alipay" : String.valueOf(body.get("payMethod"));
        Long userId = SecurityUtils.getUserId();

        // 支付前先取订单快照：失败时也要能记下金额与件数
        PetCart q = new PetCart();
        q.setUserId(userId);
        q.setOrderNo(orderNo);
        List<PetCart> snapshot = petCartService.selectPetCartList(q);
        double total = 0;
        StringBuilder names = new StringBuilder();
        for (PetCart c : snapshot)
        {
            if (c.getAmount() != null) total += c.getAmount();
            if (names.length() > 0) names.append("、");
            names.append(c.getGoodsName());
        }
        total = Math.round(total * 100) / 100.0;

        PetPaymentLog pl = new PetPaymentLog();
        pl.setOrderNo(orderNo);
        pl.setUserId(userId);
        pl.setUserName(SecurityUtils.getUsername());
        pl.setPayMethod(payMethod);
        pl.setAmount(total);
        pl.setItems(snapshot.size());

        int n;
        try
        {
            n = petCartService.payOrder(orderNo, userId, payMethod);
        }
        catch (Exception e)
        {
            pl.setResult("fail");
            pl.setReason(shorten("支付异常：" + e.getMessage()));
            paymentLogService.record(pl);
            throw e;
        }

        String method = "wechat".equals(payMethod) ? "微信支付" : "balance".equals(payMethod) ? "余额支付" : "支付宝";

        if (n <= 0)
        {
            pl.setResult("fail");
            pl.setReason(snapshot.isEmpty() ? "订单不存在或不属于当前用户" : "订单不可支付（已支付或已取消）");
            paymentLogService.record(pl);
            return error("订单不可支付（可能已支付或已取消）");
        }

        // 汇总本单信息写通知
        petNotificationService.push(userId, SecurityUtils.getUsername(), "order",
                "订单支付成功",
                "订单 " + orderNo + " 已通过" + method + "支付成功，共 ¥" + String.format("%.2f", total)
                        + "（" + names + "），我们会尽快为你安排发货。",
                null);

        pl.setResult("success");
        pl.setReason("通过" + method + "支付成功");
        paymentLogService.record(pl);

        Map<String, Object> data = new HashMap<>();
        data.put("orderNo", orderNo);
        data.put("items", n);
        data.put("total", total);
        return AjaxResult.success("支付成功", data);
    }

    /** 失败原因限长，避免超出 reason 字段（255） */
    private String shorten(String s)
    {
        if (s == null) return null;
        return s.length() > 240 ? s.substring(0, 240) : s;
    }

    /**
     * 取消订单：登录用户只能取消自己的订单，并写入取消记录供后台查看
     */
    @Log(title = "购物车管理", businessType = BusinessType.UPDATE)
    @PostMapping("/cancel/{cartId}")
    public AjaxResult cancel(@PathVariable("cartId") Long cartId,
                             @RequestParam(value = "reason", required = false) String reason)
    {
        PetCart cart = petCartService.selectPetCartByCartId(cartId);
        if (cart == null)
        {
            return error("订单不存在");
        }
        if (!SecurityUtils.isAdmin()
                && (cart.getUserId() == null || !cart.getUserId().equals(SecurityUtils.getUserId())))
        {
            return error("只能取消自己的订单");
        }
        boolean byAdmin = SecurityUtils.isAdmin() && !SecurityUtils.getUserId().equals(cart.getUserId());
        petCartService.cancelPetCart(cartId, reason, SecurityUtils.getUserId(), SecurityUtils.getUsername());
        // 通知订单主人（自己取消也留一条记录）
        petNotificationService.push(cart.getUserId(), cart.getUserName(), "order",
                byAdmin ? "订单已被管理员取消" : "订单已取消",
                "订单 " + (cart.getOrderNo() == null ? ("#" + cartId) : cart.getOrderNo())
                        + "（" + cart.getGoodsName() + "）已取消" + (StringUtils.isNotBlank(reason) ? "，原因：" + reason : "") + "。",
                cartId);
        return success("订单已取消");
    }

    /**
     * 删除购物车记录：普通用户只能删除自己的
     */
    @Log(title = "购物车管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{cartIds}")
    public AjaxResult remove(@PathVariable Long[] cartIds)
    {
        if (!SecurityUtils.isAdmin())
        {
            Long currentUserId = SecurityUtils.getUserId();
            for (Long cartId : cartIds)
            {
                PetCart cart = petCartService.selectPetCartByCartId(cartId);
                if (cart == null || cart.getUserId() == null || !cart.getUserId().equals(currentUserId))
                {
                    return error("只能删除自己的购物车记录");
                }
            }
        }
        return toAjax(petCartService.deletePetCartByCartIds(cartIds));
    }
}
