package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 客户档案 pet_customer
 *
 * @author ruoyi
 */
public class PetCustomer extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 客户ID */
    private Long customerId;
    /** 客户编号 */
    private String customerCode;
    /** 关联账号ID */
    private Long userId;
    /** 客户姓名 */
    private String customerName;
    /** 手机号 */
    private String phone;
    /** 性别（0男 1女 2未知） */
    private String gender;
    /** 生日 */
    private Date birthday;
    /** 归属门店 */
    private Long storeId;
    /** 门店名称（联表） */
    private String storeName;
    /** 会员等级 */
    private String level;
    /** 来源渠道 */
    private String source;
    /** 标签 */
    private String tags;
    /** 累计订单数 */
    private Integer orderCount;
    /** 累计消费 */
    private BigDecimal totalAmount;
    /** 首次成交时间 */
    private Date firstDealTime;
    /** 最近成交时间 */
    private Date lastDealTime;
    /** 状态（0正常 1流失） */
    private String status;
    /** 删除标志 */
    private String delFlag;
    /** 名下宠物数（统计列） */
    private Integer petCount;
    /** 名下宠物（详情） */
    private List<PetOwner> pets;

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getCustomerCode() { return customerCode; }
    public void setCustomerCode(String customerCode) { this.customerCode = customerCode; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Date getBirthday() { return birthday; }
    public void setBirthday(Date birthday) { this.birthday = birthday; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public Integer getOrderCount() { return orderCount; }
    public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Date getFirstDealTime() { return firstDealTime; }
    public void setFirstDealTime(Date firstDealTime) { this.firstDealTime = firstDealTime; }

    public Date getLastDealTime() { return lastDealTime; }
    public void setLastDealTime(Date lastDealTime) { this.lastDealTime = lastDealTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public Integer getPetCount() { return petCount; }
    public void setPetCount(Integer petCount) { this.petCount = petCount; }

    public List<PetOwner> getPets() { return pets; }
    public void setPets(List<PetOwner> pets) { this.pets = pets; }
}
