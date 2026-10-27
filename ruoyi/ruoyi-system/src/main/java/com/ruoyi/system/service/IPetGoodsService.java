package com.ruoyi.system.service;

import java.math.BigDecimal;
import java.util.List;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetGoodsSku;
import com.ruoyi.system.domain.PetStockLog;

/**
 * 商品与库存 服务层
 *
 * @author ruoyi
 */
public interface IPetGoodsService
{
    public List<PetGoods> selectPetGoodsList(PetGoods goods);

    /** 商品详情（含 SKU） */
    public PetGoods selectPetGoodsById(Long goodsId);

    public PetGoods selectPetGoodsByCode(String goodsCode);

    public PetGoodsSku selectSkuById(Long skuId);

    public int insertPetGoods(PetGoods goods);

    public int updatePetGoods(PetGoods goods);

    public int deletePetGoodsByIds(Long[] goodsIds);

    /**
     * 库存变动并记流水
     *
     * @param changeType 1采购入库 2销售出库 3取消回补 4盘亏 5退款入库
     * @return 变动后库存
     */
    public int changeStock(Long goodsId, Long skuId, String changeType, Integer qty,
                           String operator, String bizNo, String remark);

    /** 下单扣库存：库存不足抛业务异常 */
    public void deductForOrder(Long goodsId, Long skuId, Integer qty, String orderNo, String operator);

    /** 下单只做库存校验不扣减（真正扣减在支付时），库存不足抛业务异常 */
    public void checkStock(Long goodsId, Long skuId, Integer qty, String goodsName);

    public List<PetStockLog> selectStockLogList(PetStockLog query);

    public List<PetGoods> selectLowStockGoods(Integer threshold);

    /** 购物车结算价：以库中价格为准，返回该商品当前可售价格 */
    public BigDecimal resolvePrice(PetGoods goods, PetGoodsSku sku);
}
