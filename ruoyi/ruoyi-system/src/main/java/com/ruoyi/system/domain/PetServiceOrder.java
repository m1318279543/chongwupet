package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 服务工单 pet_service_order
 *
 * 状态：0待接单 1已接单 2服务中 3已完成 4已取消 5爽约
 *
 * @author ruoyi
 */
public class PetServiceOrder extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 工单ID */
    private Long serviceId;

    /** 工单号 */
    @Excel(name = "工单号")
    private String serviceNo;

    /** 来源预约ID */
    private Long appointmentId;

    /** 门店ID */
    private Long storeId;

    /** 门店名称（关联查询） */
    @Excel(name = "门店")
    private String storeName;

    /** 客户ID */
    private Long customerId;

    /** 客户姓名（快照） */
    @Excel(name = "客户")
    private String customerName;

    /** 账号ID */
    private Long userId;

    /** 宠物ID */
    private Long petId;

    /** 宠物名称（快照） */
    @Excel(name = "宠物")
    private String petName;

    /** 服务项目ID */
    private Long itemId;

    /** 服务项目名称（快照） */
    @Excel(name = "服务项目")
    private String itemName;

    /** 项目类型（快照） */
    private String itemType;

    /** 项目类型名称（关联查询，非本表字段） */
    private String itemTypeName;

    /** 服务方式（1到店 2上门） */
    @Excel(name = "服务方式", readConverterExp = "1=到店,2=上门")
    private String serviceMode;

    /** 联系人 */
    @Excel(name = "联系人")
    private String contactName;

    /** 联系电话 */
    @Excel(name = "联系电话")
    private String contactPhone;

    /** 上门地址（上门服务必填） */
    @Excel(name = "服务地址")
    private String address;

    /** 成交价（快照，单价） */
    @Excel(name = "成交价")
    private BigDecimal price;

    /** 数量 */
    @Excel(name = "数量")
    private Integer qty;

    /** 应付总额（单价 × 数量） */
    @Excel(name = "应付总额")
    private BigDecimal totalAmount;

    /** 执行员工ID */
    private Long staffId;

    /** 执行员工姓名 */
    @Excel(name = "执行人")
    private String staffName;

    /** 约定到店时间 */
    @Excel(name = "到店时间", width = 30, dateFormat = "yyyy-MM-dd HH:mm")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date appointTime;

    /** 开始服务时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date startTime;

    /** 完成时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date finishTime;

    /** 状态（0待接单 1已接单 2服务中 3已完成 4已取消 5爽约） */
    @Excel(name = "状态", readConverterExp = "0=待接单,1=已接单,2=服务中,3=已完成,4=已取消,5=爽约")
    private String status;

    /** 收费状态（0未收 1已收） */
    @Excel(name = "收费", readConverterExp = "0=未收,1=已收")
    private String payStatus;

    /** 支付方式（alipay/wechat/balance） */
    private String payMethod;

    /** 支付时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date payTime;

    /** 取消原因 */
    private String cancelReason;

    /** 客户评分 */
    private Integer score;

    /** 客户评价 */
    private String comment;

    /** 来源（1预约 2后台开单） */
    private String source;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    /** 查询辅助：日期（yyyy-MM-dd） */
    private String queryDate;

    public String getServiceMode() { return serviceMode; }
    public void setServiceMode(String serviceMode) { this.serviceMode = serviceMode; }

    public String getContactName() { return contactName; }
    public void setContactName(String contactName) { this.contactName = contactName; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getPayMethod() { return payMethod; }
    public void setPayMethod(String payMethod) { this.payMethod = payMethod; }

    public Date getPayTime() { return payTime; }
    public void setPayTime(Date payTime) { this.payTime = payTime; }

    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }

    public Long getServiceId() { return serviceId; }
    public void setServiceId(Long serviceId) { this.serviceId = serviceId; }

    public String getServiceNo() { return serviceNo; }
    public void setServiceNo(String serviceNo) { this.serviceNo = serviceNo; }

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getPetId() { return petId; }
    public void setPetId(Long petId) { this.petId = petId; }

    public String getPetName() { return petName; }
    public void setPetName(String petName) { this.petName = petName; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public String getItemTypeName() { return itemTypeName; }
    public void setItemTypeName(String itemTypeName) { this.itemTypeName = itemTypeName; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public Date getAppointTime() { return appointTime; }
    public void setAppointTime(Date appointTime) { this.appointTime = appointTime; }

    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }

    public Date getFinishTime() { return finishTime; }
    public void setFinishTime(Date finishTime) { this.finishTime = finishTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPayStatus() { return payStatus; }
    public void setPayStatus(String payStatus) { this.payStatus = payStatus; }

    public Integer getScore() { return score; }
    public void setScore(Integer score) { this.score = score; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public String getQueryDate() { return queryDate; }
    public void setQueryDate(String queryDate) { this.queryDate = queryDate; }
}
