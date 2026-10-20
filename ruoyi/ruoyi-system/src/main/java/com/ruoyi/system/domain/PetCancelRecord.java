package com.ruoyi.system.domain;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 预约/订单取消记录 pet_cancel_record
 * 前台用户取消预约、取消订单时写入一条记录，供后台查看取消记录。
 *
 * @author ruoyi
 */
public class PetCancelRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 取消记录ID */
    @Excel(name = "记录ID", cellType = com.ruoyi.common.annotation.Excel.ColumnType.NUMERIC)
    private Long recordId;

    /** 取消对象类型 appointment-预约 order-订单 */
    @Excel(name = "取消类型", readConverterExp = "appointment=取消预约,order=取消订单")
    private String targetType;

    /** 原记录ID（预约ID/订单ID） */
    @Excel(name = "原记录ID")
    private Long refId;

    /** 用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 用户名（游客为空） */
    @Excel(name = "用户名")
    private String userName;

    /** 对象名称（宠物名/商品名） */
    @Excel(name = "对象名称")
    private String targetName;

    /** 明细快照（预约时间/电话、商品规格/数量/金额等） */
    @Excel(name = "明细")
    private String detail;

    /** 取消原因 */
    @Excel(name = "取消原因")
    private String reason;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    /** 取消时间（非本表字段，供前端展示） */
    private java.util.Date cancelTime;

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getRefId() { return refId; }
    public void setRefId(Long refId) { this.refId = refId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public java.util.Date getCancelTime() { return cancelTime; }
    public void setCancelTime(java.util.Date cancelTime) { this.cancelTime = cancelTime; }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("recordId", getRecordId())
            .append("targetType", getTargetType())
            .append("refId", getRefId())
            .append("userId", getUserId())
            .append("userName", getUserName())
            .append("targetName", getTargetName())
            .append("reason", getReason())
            .append("createTime", getCreateTime())
            .toString();
    }
}
