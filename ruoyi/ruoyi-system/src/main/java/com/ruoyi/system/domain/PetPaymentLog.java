package com.ruoyi.system.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 支付流水 pet_payment_log
 * 每次支付尝试（成功或失败）都落一条，供后台订单/支付管理查看。
 *
 * @author ruoyi
 */
public class PetPaymentLog extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 流水ID */
    private Long logId;

    /** 订单号 */
    @Excel(name = "订单号")
    private String orderNo;

    /** 用户ID */
    private Long userId;

    /** 用户昵称 */
    @Excel(name = "用户")
    private String userName;

    /** 支付通道 */
    @Excel(name = "支付通道", readConverterExp = "alipay=支付宝,wechat=微信支付,balance=平台余额")
    private String payMethod;

    /** 订单金额 */
    @Excel(name = "金额")
    private Double amount;

    /** 商品件数 */
    private Integer items;

    /** 结果 success/fail */
    @Excel(name = "结果", readConverterExp = "success=成功,fail=失败")
    private String result;

    /** 失败原因 */
    @Excel(name = "说明")
    private String reason;

    public Long getLogId() { return logId; }
    public void setLogId(Long logId) { this.logId = logId; }

    public String getOrderNo() { return orderNo; }
    public void setOrderNo(String orderNo) { this.orderNo = orderNo; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getPayMethod() { return payMethod; }
    public void setPayMethod(String payMethod) { this.payMethod = payMethod; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public Integer getItems() { return items; }
    public void setItems(Integer items) { this.items = items; }

    public String getResult() { return result; }
    public void setResult(String result) { this.result = result; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    @Override
    public String toString()
    {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("logId", getLogId())
            .append("orderNo", getOrderNo())
            .append("userId", getUserId())
            .append("userName", getUserName())
            .append("payMethod", getPayMethod())
            .append("amount", getAmount())
            .append("result", getResult())
            .append("reason", getReason())
            .append("createTime", getCreateTime())
            .toString();
    }
}
