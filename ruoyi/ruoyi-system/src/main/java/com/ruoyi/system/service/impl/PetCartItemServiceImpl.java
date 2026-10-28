package com.ruoyi.system.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetCartItem;
import com.ruoyi.system.mapper.PetCartItemMapper;
import com.ruoyi.system.service.IPetCartItemService;

/**
 * 前台购物车（按账号持久化）Service 实现
 *
 * @author ruoyi
 */
@Service
public class PetCartItemServiceImpl implements IPetCartItemService
{
    /** 明细类型：商品 */
    private static final String TYPE_GOODS = "1";
    /** 明细类型：宠物 */
    private static final String TYPE_PET = "2";

    @Autowired
    private PetCartItemMapper petCartItemMapper;

    @Override
    public List<PetCartItem> selectByUser(Long userId)
    {
        return petCartItemMapper.selectByUser(userId);
    }

    @Override
    @Transactional
    public PetCartItem addToCart(Long userId, PetCartItem item)
    {
        String itemType = StringUtils.isNotEmpty(item.getItemType()) ? item.getItemType() : TYPE_GOODS;
        item.setItemType(itemType);
        item.setUserId(userId);

        List<PetCartItem> existing = petCartItemMapper.selectByUser(userId);
        PetCartItem match = null;
        for (PetCartItem row : existing)
        {
            if (!itemType.equals(row.getItemType()))
            {
                continue;
            }
            if (TYPE_PET.equals(itemType))
            {
                // 宠物是活的：一只一条，同只宠物重复加视为重新选中
                if (item.getPetId() != null && item.getPetId().equals(row.getPetId()))
                {
                    match = row;
                }
            }
            else
            {
                // 商品：goodsId + skuId 同款（skuId 可能同时为 null）
                boolean sameGoods = item.getGoodsId() != null && item.getGoodsId().equals(row.getGoodsId());
                boolean sameSku = row.getSkuId() == null ? item.getSkuId() == null : row.getSkuId().equals(item.getSkuId());
                if (sameGoods && sameSku)
                {
                    match = row;
                }
            }
            if (match != null)
            {
                break;
            }
        }

        if (match == null)
        {
            PetCartItem insert = new PetCartItem();
            insert.setUserId(userId);
            insert.setItemType(itemType);
            insert.setPetId(item.getPetId());
            insert.setGoodsId(item.getGoodsId());
            insert.setSkuId(item.getSkuId());
            insert.setGoodsName(item.getGoodsName());
            insert.setGoodsImage(item.getGoodsImage());
            insert.setGoodsSpec(item.getGoodsSpec());
            insert.setPrice(item.getPrice());
            insert.setQty(TYPE_PET.equals(itemType) ? 1 : Math.max(1, item.getQty() == null ? 1 : item.getQty()));
            insert.setChecked("1");
            petCartItemMapper.insertPetCartItem(insert);
            return insert;
        }

        // 已存在：商品数量 +1（以入参步进），宠物只刷新快照并保持选中
        if (TYPE_PET.equals(itemType))
        {
            match.setPrice(item.getPrice());
            match.setGoodsName(item.getGoodsName());
            match.setGoodsImage(item.getGoodsImage());
            match.setGoodsSpec(item.getGoodsSpec());
            match.setQty(1);
        }
        else
        {
            int step = item.getQty() == null || item.getQty() < 1 ? 1 : item.getQty();
            match.setQty(Math.min(99, (match.getQty() == null ? 1 : match.getQty()) + step));
            match.setPrice(item.getPrice());
        }
        match.setChecked("1");
        petCartItemMapper.updatePetCartItem(match);
        return match;
    }

    @Override
    @Transactional
    public List<PetCartItem> mergeCart(Long userId, List<PetCartItem> items)
    {
        if (items != null)
        {
            for (PetCartItem item : items)
            {
                addToCart(userId, item);
            }
        }
        return petCartItemMapper.selectByUser(userId);
    }

    @Override
    public int updateQty(Long userId, Long cartItemId, Integer qty)
    {
        int safe = qty == null ? 1 : Math.max(1, Math.min(99, qty));
        return petCartItemMapper.updateQty(userId, cartItemId, safe);
    }

    @Override
    public int updateChecked(Long userId, Long cartItemId, boolean checked)
    {
        return petCartItemMapper.updateChecked(userId, cartItemId, checked ? "1" : "0");
    }

    @Override
    public int updateCheckedAll(Long userId, boolean checked)
    {
        return petCartItemMapper.updateCheckedAll(userId, checked ? "1" : "0");
    }

    @Override
    public int deleteByIds(Long userId, List<Long> cartItemIds)
    {
        if (cartItemIds == null || cartItemIds.isEmpty())
        {
            return 0;
        }
        return petCartItemMapper.deleteByIds(userId, cartItemIds);
    }

    @Override
    public int clear(Long userId)
    {
        return petCartItemMapper.deleteByUser(userId);
    }
}
