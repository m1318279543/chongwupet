package com.ruoyi.system.domain;

import java.util.Date;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 员工 pet_staff
 *
 * @author ruoyi
 */
public class PetStaff extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 员工ID */
    private Long staffId;
    /** 关联账号ID */
    private Long userId;
    /** 所属门店 */
    private Long storeId;
    /** 门店名称（联表） */
    private String storeName;
    /** 姓名 */
    private String staffName;
    /** 岗位 */
    private String post;
    /** 手机号 */
    private String phone;
    /** 入职日期 */
    private Date entryDate;
    /** 状态（0在职 1离职） */
    private String status;
    /** 删除标志 */
    private String delFlag;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getPost() { return post; }
    public void setPost(String post) { this.post = post; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Date getEntryDate() { return entryDate; }
    public void setEntryDate(Date entryDate) { this.entryDate = entryDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
}
