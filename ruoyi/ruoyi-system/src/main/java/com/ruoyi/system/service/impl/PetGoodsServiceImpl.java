package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetGoodsSku;
import com.ruoyi.system.domain.PetStockLog;
import com.ruoyi.system.mapper.PetGoodsMapper;
import com.ruoyi.system.service.IPetGoodsService;

/**
 * 商品与库存 服务层实现
 *
 * 库存规则：
 *   - 真实库存记在 SKU 上，商品上的 stock 是 SKU 汇总；
 *   - 每次变动都写 pet_stock_log，before/after 都落库，账实可对；
 *   - 销售出库用「带条件的 UPDATE」，库存不足时影响行数为 0，因此不会超卖。
 *
 * @author ruoyi
 */
@Service
public class PetGoodsServiceImpl implements IPetGoodsService
{
    @Autowired
    private PetGoodsMapper petGoodsMapper;

    @Override
    public List<PetGoods> selectPetGoodsList(PetGoods goods)
    {
        return petGoodsMapper.selectPetGoodsList(goods);
    }

    @Override
    public List<PetGoods> selectFeaturedGoods(int limit)
    {
        return petGoodsMapper.selectFeaturedGoods(limit);
    }

    @Override
    public Map<String, Object> selectGoodsStats()
    {
        return petGoodsMapper.selectGoodsStats();
    }

    @Override
    public PetGoods selectPetGoodsById(Long goodsId)
    {
        PetGoods goods = petGoodsMapper.selectPetGoodsById(goodsId);
        if (goods != null)
        {
            goods.setSkus(petGoodsMapper.selectSkusByGoodsId(goodsId));
        }
        return goods;
    }

    @Override
    public PetGoods selectPetGoodsByCode(String goodsCode)
    {
        return petGoodsMapper.selectPetGoodsByCode(goodsCode);
    }

    @Override
    public PetGoodsSku selectSkuById(Long skuId)
    {
        return petGoodsMapper.selectSkuById(skuId);
    }

    @Override
    @Transactional
    public int insertPetGoods(PetGoods goods)
    {
        if (StringUtils.isBlank(goods.getGoodsName()))
        {
            throw new ServiceException("商品名称不能为空");
        }
        if (goods.getPrice() == null || goods.getPrice().compareTo(BigDecimal.ZERO) < 0)
        {
            throw new ServiceException("请填写正确的售价");
        }
        if (StringUtils.isBlank(goods.getGoodsCode()))
        {
            goods.setGoodsCode("G" + System.currentTimeMillis());
        }
        if (petGoodsMapper.selectPetGoodsByCode(goods.getGoodsCode()) != null)
        {
            throw new ServiceException("商品编码已存在");
        }
        goods.setStatus(StringUtils.isBlank(goods.getStatus()) ? "0" : goods.getStatus());
        goods.setUnit(StringUtils.isBlank(goods.getUnit()) ? "件" : goods.getUnit());
        int stock = goods.getStock() == null ? 0 : goods.getStock();
        goods.setStock(stock);
        int rows = petGoodsMapper.insertPetGoods(goods);

        // 建档即建默认 SKU，库存从这个 SKU 开始
        PetGoodsSku sku = new PetGoodsSku();
        sku.setGoodsId(goods.getGoodsId());
        sku.setSkuName(StringUtils.isBlank(goods.getSpec()) ? "默认规格" : goods.getSpec());
        sku.setSpec(goods.getSpec());
        sku.setPrice(goods.getPrice());
        sku.setStock(stock);
        petGoodsMapper.insertPetSku(sku);
        if (stock > 0)
        {
            writeLog(goods, sku, "1", stock, 0, stock, goods.getCreateBy(), null, "新建商品期初入库");
        }
        return rows;
    }

    @Override
    public int updatePetGoods(PetGoods goods)
    {
        if (goods.getGoodsId() == null)
        {
            throw new ServiceException("商品ID不能为空");
        }
        // 价格改动同步到默认 SKU，避免商品价与 SKU 价长期不一致
        List<PetGoodsSku> skus = petGoodsMapper.selectSkusByGoodsId(goods.getGoodsId());
        if (goods.getPrice() != null && skus.size() == 1)
        {
            PetGoodsSku sku = skus.get(0);
            if (sku.getPrice() == null || sku.getPrice().compareTo(goods.getPrice()) != 0)
            {
                PetGoodsSku update = new PetGoodsSku();
                update.setSkuId(sku.getSkuId());
                update.setPrice(goods.getPrice());
                petGoodsMapper.updatePetSku(update);
            }
        }
        return petGoodsMapper.updatePetGoods(goods);
    }

    @Override
    public int deletePetGoodsByIds(Long[] goodsIds)
    {
        return petGoodsMapper.deletePetGoodsByIds(goodsIds);
    }

    @Override
    @Transactional
    public int changeStock(Long goodsId, Long skuId, String changeType, Integer qty,
                           String operator, String bizNo, String remark)
    {
        if (qty == null || qty <= 0)
        {
            throw new ServiceException("数量必须大于 0");
        }
        PetGoods goods = petGoodsMapper.selectPetGoodsById(goodsId);
        if (goods == null)
        {
            throw new ServiceException("商品不存在");
        }
        PetGoodsSku sku = resolveSku(goodsId, skuId);
        int before = sku.getStock() == null ? 0 : sku.getStock();
        // 1 采购入库 / 3 取消回补 / 5 退款入库 都是加库存
        boolean increase = "1".equals(changeType) || "3".equals(changeType) || "5".equals(changeType);
        int after;
        if (increase)
        {
            petGoodsMapper.addStock(sku.getSkuId(), qty);
            after = before + qty;
        }
        else
        {
            int affected = petGoodsMapper.deductStock(sku.getSkuId(), qty);
            if (affected == 0)
            {
                throw new ServiceException("库存不足，当前仅剩 " + before + " 件");
            }
            after = before - qty;
        }
        petGoodsMapper.refreshGoodsStock(goodsId);
        writeLog(goods, sku, changeType, qty, before, after, operator, bizNo, remark);
        return after;
    }

    @Override
    @Transactional
    public void deductForOrder(Long goodsId, Long skuId, Integer qty, String orderNo, String operator)
    {
        PetGoods goods = petGoodsMapper.selectPetGoodsById(goodsId);
        if (goods == null || "2".equals(goods.getDelFlag()))
        {
            throw new ServiceException("商品已下架或不存在，请重新加购");
        }
        if ("1".equals(goods.getStatus()))
        {
            throw new ServiceException("「" + goods.getGoodsName() + "」已下架，请移除后重新下单");
        }
        PetGoodsSku sku = resolveSku(goodsId, skuId);
        int before = sku.getStock() == null ? 0 : sku.getStock();
        int affected = petGoodsMapper.deductStock(sku.getSkuId(), qty);
        if (affected == 0)
        {
            throw new ServiceException("「" + goods.getGoodsName() + "」库存不足，当前仅剩 " + before + " 件");
        }
        petGoodsMapper.refreshGoodsStock(goodsId);
        writeLog(goods, sku, "2", qty, before, before - qty, operator, orderNo, "订单销售出库");
    }

    @Override
    public void checkStock(Long goodsId, Long skuId, Integer qty, String goodsName)
    {
        if (qty == null || qty < 1)
        {
            qty = 1;
        }
        PetGoodsSku sku = resolveSku(goodsId, skuId);
        int have = sku.getStock() == null ? 0 : sku.getStock();
        if (have < qty)
        {
            throw new ServiceException("「" + goodsName + "」库存不足，当前仅剩 " + have + " 件");
        }
    }

    @Override
    public List<PetStockLog> selectStockLogList(PetStockLog query)
    {
        return petGoodsMapper.selectStockLogList(query);
    }

    @Override
    public List<PetGoods> selectLowStockGoods(Integer threshold)
    {
        return petGoodsMapper.selectLowStockGoods(threshold == null ? 10 : threshold);
    }

    @Override
    public BigDecimal resolvePrice(PetGoods goods, PetGoodsSku sku)
    {
        if (sku != null && sku.getPrice() != null)
        {
            return sku.getPrice();
        }
        return goods.getPrice() == null ? BigDecimal.ZERO : goods.getPrice();
    }

    /** 取 SKU：优先指定，否则取该商品第一个可用 SKU */
    private PetGoodsSku resolveSku(Long goodsId, Long skuId)
    {
        PetGoodsSku sku = null;
        if (skuId != null)
        {
            sku = petGoodsMapper.selectSkuById(skuId);
            if (sku != null && !goodsId.equals(sku.getGoodsId()))
            {
                sku = null;
            }
        }
        if (sku == null)
        {
            List<PetGoodsSku> skus = petGoodsMapper.selectSkusByGoodsId(goodsId);
            if (skus.isEmpty())
            {
                throw new ServiceException("该商品没有可售规格，请先在后台维护 SKU");
            }
            sku = skus.get(0);
        }
        return sku;
    }

    private void writeLog(PetGoods goods, PetGoodsSku sku, String changeType, int qty,
                          int before, int after, String operator, String bizNo, String remark)
    {
        PetStockLog log = new PetStockLog();
        log.setGoodsId(goods.getGoodsId());
        log.setSkuId(sku.getSkuId());
        log.setGoodsName(goods.getGoodsName());
        log.setSkuName(sku.getSkuName());
        log.setChangeType(changeType);
        log.setQty(qty);
        log.setBeforeQty(before);
        log.setAfterQty(after);
        log.setBizNo(bizNo);
        log.setOperator(StringUtils.isBlank(operator) ? "system" : operator);
        log.setRemark(remark);
        petGoodsMapper.insertStockLog(log);
    }
}
