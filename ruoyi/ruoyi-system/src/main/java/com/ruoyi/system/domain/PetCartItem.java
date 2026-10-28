package com.ruoyi.system.domain;

/**
 * 前台购物车条目 pet_cart_item
 * 登录用户的待结算商品，按 user_id 持久化；下单后转入 pet_order / pet_cart（订单快照）。
 *
 * @author ruoyi
 */
public class PetCartItem
{
    private static final long serialVersionUID = 1L;

    /** 购物车条目ID */
    private Long cartItemId;

    /** 用户ID */
    private Long userId;

    /** 明细类型：'1' 商品（宠物粮等），'2' 宠物（与订单明细 itemType 同口径） */
    private String itemType;

    /** 宠物ID（itemType='2' 时必填） */
    private Long petId;

    /** 商品ID（itemType='1'） */
    private Long goodsId;

    /** SKU ID */
    private Long skuId;

    /** 商品名称 */
    private String goodsName;

    /** 商品图片 */
    private String goodsImage;

    /** 商品规格 */
    private String goodsSpec;

    /** 单价 */
    private Double price;

    /** 数量（宠物恒为 1） */
    private Integer qty;

    /** 是否选中：'1' 是 '0' 否 */
    private String checked;

    /** 加入时间 */
    private java.util.Date createTime;

    /** 更新时间 */
    private java.util.Date updateTime;

    public Long getCartItemId() { return cartItemId; }
    public void setCartItemId(Long cartItemId) { this.cartItemId = cartItemId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

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

    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }

    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }

    public String getChecked() { return checked; }
    public void setChecked(String checked) { this.checked = checked; }

    public java.util.Date getCreateTime() { return createTime; }
    public void setCreateTime(java.util.Date createTime) { this.createTime = createTime; }

    public java.util.Date getUpdateTime() { return updateTime; }
    public void setUpdateTime(java.util.Date updateTime) { this.updateTime = updateTime; }
}
