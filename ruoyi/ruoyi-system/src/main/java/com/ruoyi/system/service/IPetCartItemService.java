package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetCartItem;

/**
 * 前台购物车（按账号持久化）Service 接口
 *
 * @author ruoyi
 */
public interface IPetCartItemService
{
    /** 查询用户购物车全部条目 */
    public List<PetCartItem> selectByUser(Long userId);

    /** 加入购物车：同款（宠物按 petId、商品按 goodsId+skuId）累加数量，宠物恒为 1 只 */
    public PetCartItem addToCart(Long userId, PetCartItem item);

    /** 登录后合并本地购物车：逐条 addToCart，返回合并后的完整列表 */
    public List<PetCartItem> mergeCart(Long userId, List<PetCartItem> items);

    /** 修改数量（宠物不在此列，由 addToCart/前端锁定为 1） */
    public int updateQty(Long userId, Long cartItemId, Integer qty);

    /** 修改选中态 */
    public int updateChecked(Long userId, Long cartItemId, boolean checked);

    /** 全选 / 全不选 */
    public int updateCheckedAll(Long userId, boolean checked);

    /** 删除条目（仅限本人） */
    public int deleteByIds(Long userId, List<Long> cartItemIds);

    /** 清空购物车 */
    public int clear(Long userId);
}
