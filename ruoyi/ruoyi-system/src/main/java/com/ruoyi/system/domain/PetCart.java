package com.ruoyi.system.domain;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 购物车/订单快照表 pet_cart
 * 前台结算时将选中的购物车商品写入此表，供后台统一管理。
 *
 * @author ruoyi
 */
public class PetCart extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 购物车记录ID */
    @Excel(name = "记录ID", cellType = com.ruoyi.common.annotation.Excel.ColumnType.NUMERIC)
    private Long cartId;

    /** 用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 门店ID */
    private Long storeId;

    /** 客户ID */
    private Long customerId;

    /** 商品ID */
    private Long goodsId;

    /** SKU ID */
    private Long skuId;

    /** 明细类型：'1' 商品（宠物粮等），'2' 宠物（与订单明细 itemType 同口径） */
    private String itemType;

    /** 宠物行对应的宠物 id（itemType='2' 时必填） */
    private Long petId;

    /** 用户名（关联 sys_user 查询展示用，非本表字段） */
    @Excel(name = "用户名")
    private String userName;

    /** 商品名称 */
    @Excel(name = "商品名称")
    private String goodsName;

    /** 商品图片 */
    private String goodsImage;

    /** 商品规格 */
    @Excel(name = "商品规格")
    private String goodsSpec;

    /** 单价 */
    @Excel(name = "单价")
    private Double price;

    /** 数量 */
    @Excel(name = "数量")
    private Integer qty;

    /** 小计金额 */
    @Excel(name = "小计")
    private Double amount;

    /** 状态（0正常 3已取消） */
    @Excel(name = "状态", readConverterExp = "0=正常,3=已取消")
    private String status;

    /** 订单号（同次结算共享） */
    @Excel(name = "订单号")
    private String orderNo;

    /** 支付状态（0待支付 1已支付） */
    @Excel(name = "支付状态", readConverterExp = "0=待支付,1=已支付")
    private String payStatus;

    /** 支付方式（alipay/wechat/balance） */
    @Excel(name = "支付方式")
    private String payMethod;

    /** 支付时间 */
    @Excel(name = "支付时间", dateFormat = "yyyy-MM-dd HH:mm:ss")
    private java.util.Date payTime;

    /** 查询用：paid/unpaid/fail/canceled（非表字段） */
    private String payState;

    /** 最近一次支付尝试结果 success/fail（来自 pet_payment_log，非表字段） */
    private String lastPayResult;

    /** 最近一次支付尝试说明（失败原因） */
    private String lastPayReason;

    /** 支付尝试次数 */
    private Integer payAttempts;

    public Long getCartId() { return cartId; }
    public void setCartId(Long cartId) { this.cartId = cartId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }

    public Long getSkuId() { return skuId; }
    public void setSkuId(Long skuId) { this.skuId = skuId; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public Long getPetId() { return petId; }
    public void setPetId(Long petId) { this.petId = petId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

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

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public String getPayStatus() { return payStatus; }
    public void setPayStatus(String payStatus) { this.payStatus = payStatus; }

    public String getPayMethod() { return payMethod; }
    public void setPayMethod(String payMethod) { this.payMethod = payMethod; }

    public String getPayState() { return payState; }
    public void setPayState(String payState) { this.payState = payState; }

    public String getLastPayResult() { return lastPayResult; }
    public void setLastPayResult(String lastPayResult) { this.lastPayResult = lastPayResult; }

    public String getLastPayReason() { return lastPayReason; }
    public void setLastPayReason(String lastPayReason) { this.lastPayReason = lastPayReason; }

    public Integer getPayAttempts() { return payAttempts; }
    public void setPayAttempts(Integer payAttempts) { this.payAttempts = payAttempts; }

    public java.util.Date getPayTime() { return payTime; }
    public void setPayTime(java.util.Date payTime) { this.payTime = payTime; }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("cartId", getCartId())
            .append("userId", getUserId())
            .append("goodsName", getGoodsName())
            .append("goodsSpec", getGoodsSpec())
            .append("price", getPrice())
            .append("qty", getQty())
            .append("amount", getAmount())
            .append("status", getStatus())
            .append("orderNo", getOrderNo())
            .append("payStatus", getPayStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("remark", getRemark())
            .toString();
    }
}
