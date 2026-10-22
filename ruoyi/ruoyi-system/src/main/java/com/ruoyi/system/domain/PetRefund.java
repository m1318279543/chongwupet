package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 退款单 pet_refund
 *
 * 状态：0待审核 1已退款 2已拒绝 3已撤销
 *
 * @author ruoyi
 */
public class PetRefund extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long refundId;

    @Excel(name = "退款单号")
    private String refundNo;

    @Excel(name = "订单号")
    private String orderNo;

    private Long orderId;

    private Long storeId;

    @Excel(name = "门店")
    private String storeName;

    private Long userId;

    @Excel(name = "申请账号")
    private String userName;

    @Excel(name = "退款金额")
    private BigDecimal amount;

    @Excel(name = "退款原因")
    private String reason;

    @Excel(name = "状态", readConverterExp = "0=待审核,1=已退款,2=已拒绝,3=已撤销")
    private String status;

    private String refundMethod;

    @Excel(name = "审核人")
    private String auditBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date auditTime;

    @Excel(name = "审核意见")
    private String auditRemark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date finishTime;

    /** 查询辅助：关键词（退款单号/订单号/账号） */
    private String keyword;

    /** 查询辅助：日期 yyyy-MM-dd */
    private String queryDate;

    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }

    public String getRefundNo() { return refundNo; }
    public void setRefundNo(String refundNo) { this.refundNo = refundNo; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public Long getOrderId() { return orderId; }
    public void setOrderId(Long orderId) { this.orderId = orderId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public String getAuditBy() { return auditBy; }
    public void setAuditBy(String auditBy) { this.auditBy = auditBy; }

    public Date getAuditTime() { return auditTime; }
    public void setAuditTime(Date auditTime) { this.auditTime = auditTime; }

    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }

    public Date getFinishTime() { return finishTime; }
    public void setFinishTime(Date finishTime) { this.finishTime = finishTime; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public String getQueryDate() { return queryDate; }
    public void setQueryDate(String queryDate) { this.queryDate = queryDate; }
}
