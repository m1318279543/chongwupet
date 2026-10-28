package com.ruoyi.web.controller.system;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
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
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetCartItem;
import com.ruoyi.system.service.IPetCartItemService;

/**
 * 前台购物车 Controller（按账号持久化）
 *
 * 与 /pet/cart（订单快照 + 结算提交）分离：这里只管「还没下单」的购物车条目，
 * 全部接口要求登录，数据一律归属当前登录用户。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/shopcart")
public class ShopCartController extends BaseController
{
    @Autowired
    private IPetCartItemService petCartItemService;

    /** 当前登录用户ID（未登录时 JwtAuthenticationTokenFilter 已拦截，这里兜底防 NPE） */
    private Long currentUserId()
    {
        return SecurityUtils.getUserId();
    }

    /** 查询我的购物车 */
    @GetMapping("/items")
    public AjaxResult list()
    {
        return AjaxResult.success(petCartItemService.selectByUser(currentUserId()));
    }

    /** 加入购物车（单条，服务端按同款合并，返回合并后的完整列表） */
    @Log(title = "前台购物车", businessType = BusinessType.INSERT)
    @PostMapping("/items")
    public AjaxResult add(@RequestBody PetCartItem item)
    {
        Long userId = currentUserId();
        petCartItemService.addToCart(userId, item);
        return AjaxResult.success(petCartItemService.selectByUser(userId));
    }

    /** 登录后合并本地购物车：逐条合并后返回完整列表 */
    @Log(title = "前台购物车", businessType = BusinessType.UPDATE)
    @PostMapping("/items/merge")
    public AjaxResult merge(@RequestBody List<PetCartItem> items)
    {
        return AjaxResult.success(petCartItemService.mergeCart(currentUserId(), items));
    }

    /** 修改数量 / 选中态（body: { qty, checked }，传哪个改哪个） */
    @Log(title = "前台购物车", businessType = BusinessType.UPDATE)
    @PutMapping("/items/{cartItemId}")
    public AjaxResult update(@PathVariable("cartItemId") Long cartItemId,
                             @RequestBody(required = false) Map<String, Object> body)
    {
        Long userId = currentUserId();
        if (body != null)
        {
            if (body.get("qty") != null)
            {
                petCartItemService.updateQty(userId, cartItemId, Integer.parseInt(String.valueOf(body.get("qty"))));
            }
            if (body.get("checked") != null)
            {
                petCartItemService.updateChecked(userId, cartItemId, "1".equals(String.valueOf(body.get("checked"))) || Boolean.parseBoolean(String.valueOf(body.get("checked"))));
            }
        }
        return success();
    }

    /** 全选 / 全不选（?checked=1|0） */
    @Log(title = "前台购物车", businessType = BusinessType.UPDATE)
    @PutMapping("/items/checkall")
    public AjaxResult checkAll(@RequestParam(value = "checked", defaultValue = "1") String checked)
    {
        petCartItemService.updateCheckedAll(currentUserId(), "1".equals(checked) || "true".equalsIgnoreCase(checked));
        return success();
    }

    /** 删除条目（仅限本人） */
    @Log(title = "前台购物车", businessType = BusinessType.DELETE)
    @DeleteMapping("/items/{cartItemIds}")
    public AjaxResult remove(@PathVariable Long[] cartItemIds)
    {
        Long userId = currentUserId();
        for (Long id : cartItemIds)
        {
            petCartItemService.deleteByIds(userId, java.util.Collections.singletonList(id));
        }
        return success();
    }

    /** 清空我的购物车 */
    @Log(title = "前台购物车", businessType = BusinessType.DELETE)
    @DeleteMapping("/items")
    public AjaxResult clear()
    {
        petCartItemService.clear(currentUserId());
        return success();
    }
}
