package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetGoodsSku;
import com.ruoyi.system.domain.PetStockLog;

/**
 * 商品与库存 Mapper
 *
 * @author ruoyi
 */
public interface PetGoodsMapper
{
    public List<PetGoods> selectPetGoodsList(PetGoods goods);

    public PetGoods selectPetGoodsById(Long goodsId);

    public PetGoods selectPetGoodsByCode(@Param("goodsCode") String goodsCode);

    public List<PetGoodsSku> selectSkusByGoodsId(Long goodsId);

    public PetGoodsSku selectSkuById(Long skuId);

    public int insertPetGoods(PetGoods goods);

    public int updatePetGoods(PetGoods goods);

    public int deletePetGoodsByIds(Long[] goodsIds);

    public int insertPetSku(PetGoodsSku sku);

    public int updatePetSku(PetGoodsSku sku);

    /** 扣减库存（带库存充足校验，返回影响行数，0 表示库存不足） */
    public int deductStock(@Param("skuId") Long skuId, @Param("qty") Integer qty);

    /** 增加库存 */
    public int addStock(@Param("skuId") Long skuId, @Param("qty") Integer qty);

    /** 重算商品库存汇总 */
    public int refreshGoodsStock(Long goodsId);

    public int insertStockLog(PetStockLog log);

    public List<PetStockLog> selectStockLogList(PetStockLog query);

    /** 低库存商品（后台预警） */
    public List<PetGoods> selectLowStockGoods(@Param("threshold") Integer threshold);
}
