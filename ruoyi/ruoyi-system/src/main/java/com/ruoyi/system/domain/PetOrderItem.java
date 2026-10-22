package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 订单明细 pet_order_item
 *
 * item_type = 1 商品行（goods_id / sku_id）
 * item_type = 2 宠物行（pet_id，一只一单）
 *
 * @author ruoyi
 */
public class PetOrderItem extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long itemId;

    private Long orderId;

    private String orderNo;

    /** 明细类型（1商品 2宠物） */
    private String itemType;

    /** 宠物ID（item_type=2 时有值） */
    private Long petId;

    private Long goodsId;

    private Long skuId;

    private String goodsName;

    private String goodsImage;

    private String goodsSpec;

    private BigDecimal price;

    private Integer qty;

    private BigDecimal amount;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public Long getPetId() { return petId; }
    public void setPetId(Long petId) { this.petId = petId; }

    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }

    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public String getGoodsName() { return goodsName; }
    public void setGoodsName(String goodsName) { this.goodsName = goodsName; }

    public String getGoodsImage() { return goodsImage; }
    public void setGoodsImage(String goodsImage) { this.goodsImage = goodsImage; }

    public String getGoodsSpec() { return goodsSpec; }
    public void setGoodsSpec(String goodsSpec) { this.goodsSpec = goodsSpec; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Date getCreateTime() { return createTime; }
    public void setCreateTime(Date createTime) { this.createTime = createTime; }
}
