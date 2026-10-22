package com.ruoyi.system.domain;

import java.util.Date;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 门店 pet_store
 *
 * @author ruoyi
 */
public class PetStore extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 门店ID */
    private Long storeId;
    /** 门店编码 */
    private String storeCode;
    /** 门店名称 */
    private String storeName;
    /** 门店类型（0直营 1加盟） */
    private String storeType;
    /** 店长 */
    private String managerName;
    /** 联系电话 */
    private String phone;
    /** 省 */
    private String province;
    /** 市 */
    private String city;
    /** 详细地址 */
    private String address;
    /** 营业时间 */
    private String businessHours;
    /** 可容纳宠物数 */
    private Integer petCapacity;
    /** 开业日期 */
    private Date openDate;
    /** 状态（0营业 1停业） */
    private String status;
    /** 删除标志（0存在 2删除） */
    private String delFlag;
    /** 在店宠物数（统计列） */
    private Integer petCount;
    /** 在职员工数（统计列） */
    private Integer staffCount;
    /** 名下客户数（统计列） */
    private Integer customerCount;

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreCode() { return storeCode; }
    public void setStoreCode(String storeCode) { this.storeCode = storeCode; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getStoreType() { return storeType; }
    public void setStoreType(String storeType) { this.storeType = storeType; }

    public String getManagerName() { return managerName; }
    public void setManagerName(String managerName) { this.managerName = managerName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getBusinessHours() { return businessHours; }
    public void setBusinessHours(String businessHours) { this.businessHours = businessHours; }

    public Integer getPetCapacity() { return petCapacity; }
    public void setPetCapacity(Integer petCapacity) { this.petCapacity = petCapacity; }

    public Date getOpenDate() { return openDate; }
    public void setOpenDate(Date openDate) { this.openDate = openDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public Integer getPetCount() { return petCount; }
    public void setPetCount(Integer petCount) { this.petCount = petCount; }

    public Integer getStaffCount() { return staffCount; }
    public void setStaffCount(Integer staffCount) { this.staffCount = staffCount; }

    public Integer getCustomerCount() { return customerCount; }
    public void setCustomerCount(Integer customerCount) { this.customerCount = customerCount; }
}
