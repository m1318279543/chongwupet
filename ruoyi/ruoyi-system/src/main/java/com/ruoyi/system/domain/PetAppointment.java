package com.ruoyi.system.domain;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.annotation.Excel.ColumnType;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 预约管理表 pet_appointment
 *
 * @author ruoyi
 */
public class PetAppointment extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 预约管理ID */
    @Excel(name = "预约管理ID", cellType = ColumnType.NUMERIC)
    private Long appointmentId;

    /** 用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 宠物ID */
    @Excel(name = "宠物ID")
    private Long petId;

    /** 门店ID */
    @Excel(name = "门店ID")
    private Long storeId;

    /** 客户ID */
    private Long customerId;

    /** 用户名（关联 sys_user 查询展示用，非本表字段） */
    @Excel(name = "用户名")
    private String userName;

    /** 宠物名称（关联 pet_info 查询展示用，非本表字段） */
    @Excel(name = "宠物名称")
    private String petName;

    /** 预约日期 */
    @Excel(name = "预约日期", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    @com.fasterxml.jackson.annotation.JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private java.util.Date appointmentDate;

    /** 联系电话（11位手机号） */
    @Excel(name = "联系电话")
    @NotBlank(message = "联系电话不能为空")
    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确，请输入11位手机号码")
    private String contactPhone;

    /** 状态(0待处理1已确认2已完成3已取消) */
    @Excel(name = "状态", readConverterExp = "0=待处理,1=已确认,2=已完成,3=已取消")
    private String status;

    /** 宠物图片（关联 pet_info 查询展示用，非本表字段） */
    private String image;

    /** 宠物分类（关联 pet_info 查询展示用，非本表字段） */
    private Long categoryId;

    public String getImage()
    {
        return image;
    }

    public void setImage(String image)
    {
        this.image = image;
    }

    public Long getCategoryId()
    {
        return categoryId;
    }

    public void setCategoryId(Long categoryId)
    {
        this.categoryId = categoryId;
    }

    public Long getAppointmentId()
    {
        return appointmentId;
    }

    public void setAppointmentId(Long appointmentId)
    {
        this.appointmentId = appointmentId;
    }

    public Long getUserId()
    {
        return userId;
    }

    public void setUserId(Long userId)
    {
        this.userId = userId;
    }

    public Long getPetId()
    {
        return petId;
    }

    public void setPetId(Long petId)
    {
        this.petId = petId;
    }

    public Long getStoreId()
    {
        return storeId;
    }

    public void setStoreId(Long storeId)
    {
        this.storeId = storeId;
    }

    public Long getCustomerId()
    {
        return customerId;
    }

    public void setCustomerId(Long customerId)
    {
        this.customerId = customerId;
    }

    public String getUserName()
    {
        return userName;
    }

    public void setUserName(String userName)
    {
        this.userName = userName;
    }

    public String getPetName()
    {
        return petName;
    }

    public void setPetName(String petName)
    {
        this.petName = petName;
    }

    public java.util.Date getAppointmentDate()
    {
        return appointmentDate;
    }

    public void setAppointmentDate(java.util.Date appointmentDate)
    {
        this.appointmentDate = appointmentDate;
    }

    public String getContactPhone()
    {
        return contactPhone;
    }

    public void setContactPhone(String contactPhone)
    {
        this.contactPhone = contactPhone;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("appointmentId", getAppointmentId())
            .append("userId", getUserId())
            .append("petId", getPetId())
            .append("appointmentDate", getAppointmentDate())
            .append("contactPhone", getContactPhone())
            .append("status", getStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
