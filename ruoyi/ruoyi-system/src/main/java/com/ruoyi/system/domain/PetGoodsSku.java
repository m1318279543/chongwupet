package com.ruoyi.system.domain;

import java.math.BigDecimal;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 商品 SKU pet_goods_sku
 *
 * @author ruoyi
 */
public class PetGoodsSku extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long skuId;

    private Long goodsId;

    private String skuName;

    private String spec;

    private BigDecimal price;

    private Integer stock;

    private String status;

    private String delFlag;

    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }

    public String getSkuName() { return skuName; }
    public void setSkuName(String skuName) { this.skuName = skuName; }

    public String getSpec() { return spec; }
    public void setSpec(String spec) { this.spec = spec; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
}
