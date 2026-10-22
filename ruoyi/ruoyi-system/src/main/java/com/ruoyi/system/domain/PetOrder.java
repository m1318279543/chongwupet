package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 订单 pet_order
 *
 * 状态：0待付款 1待发货 2已完成 3已取消
 * 支付：0未付 1已付 2已退款
 *
 * @author ruoyi
 */
public class PetOrder extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long orderId;

    @Excel(name = "订单号")
    private String orderNo;

    /** 订单类型（1商品 2宠物） */
    @Excel(name = "订单类型", readConverterExp = "1=商品单,2=宠物单")
    private String orderType;

    private Long storeId;

    @Excel(name = "门店")
    private String storeName;

    private Long customerId;

    private Long userId;

    @Excel(name = "下单账号")
    private String userName;

    @Excel(name = "件数")
    private Integer itemCount;

    @Excel(name = "商品总额")
    private BigDecimal totalAmount;

    @Excel(name = "实付金额")
    private BigDecimal payAmount;

    @Excel(name = "支付状态", readConverterExp = "0=未付,1=已付,2=已退款")
    private String payStatus;

    @Excel(name = "支付方式")
    private String payMethod;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date payTime;

    @Excel(name = "订单状态", readConverterExp = "0=待付款,1=待发货,2=已完成,3=已取消")
    private String status;

    /** 履约方式（1到店自提 2配送） */
    private String deliveryType;

    private String receiver;

    private String receiverPhone;

    private String receiverAddress;

    private String cancelReason;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date cancelTime;

    private String delFlag;

    /** 明细（非本表字段） */
    private List<PetOrderItem> items = new ArrayList<>();

    /** 查询辅助：关键词 */
    private String keyword;

    /** 查询辅助：日期 yyyy-MM-dd */
    private String queryDate;

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public Integer getItemCount() { return itemCount; }
    public void setItemCount(Integer itemCount) { this.itemCount = itemCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPayAmount() { return payAmount; }
    public void setPayAmount(BigDecimal payAmount) { this.payAmount = payAmount; }

    public String getPayStatus() { return payStatus; }
    public void setPayStatus(String payStatus) { this.payStatus = payStatus; }

    public String getPayMethod() { return payMethod; }
    public void setPayMethod(String payMethod) { this.payMethod = payMethod; }

    public Date getPayTime() { return payTime; }
    public void setPayTime(Date payTime) { this.payTime = payTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDeliveryType() { return deliveryType; }
    public void setDeliveryType(String deliveryType) { this.deliveryType = deliveryType; }

    public String getReceiver() { return receiver; }
    public void setReceiver(String receiver) { this.receiver = receiver; }

    public String getReceiverPhone() { return receiverPhone; }
    public void setReceiverPhone(String receiverPhone) { this.receiverPhone = receiverPhone; }

    public String getReceiverAddress() { return receiverAddress; }
    public void setReceiverAddress(String receiverAddress) { this.receiverAddress = receiverAddress; }

    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }

    public Date getCancelTime() { return cancelTime; }
    public void setCancelTime(Date cancelTime) { this.cancelTime = cancelTime; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public List<PetOrderItem> getItems() { return items; }
    public void setItems(List<PetOrderItem> items) { this.items = items; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public String getQueryDate() { return queryDate; }
    public void setQueryDate(String queryDate) { this.queryDate = queryDate; }
}
