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
import com.ruoyi.common.utils.poi.ExcelUtil;
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
        int count = 0;
        for (PetCart item : items)
        {
            item.setCartId(null);
            item.setUserId(userId);
            item.setUserName(userName);
            if (item.getQty() == null || item.getQty() < 1) item.setQty(1);
            if (item.getPrice() != null && item.getQty() != null)
            {
                item.setAmount(item.getPrice() * item.getQty());
            }
            count += petCartService.insertPetCart(item);
        }
        return success("已提交 " + count + " 件商品");
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
        petCartService.cancelPetCart(cartId, reason, SecurityUtils.getUserId(), SecurityUtils.getUsername());
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
