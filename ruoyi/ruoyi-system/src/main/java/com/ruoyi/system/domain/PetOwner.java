package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.Date;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物归属 pet_owner（多对多 + 易主历史）
 *
 * @author ruoyi
 */
public class PetOwner extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 归属ID */
    private Long ownerId;
    /** 宠物ID */
    private Long petId;
    /** 客户ID */
    private Long customerId;
    /** 关系（现主人/历史主人/关注） */
    private String relation;
    /** 归属开始时间 */
    private Date startTime;
    /** 归属结束时间（空=仍在名下） */
    private Date endTime;
    /** 删除标志 */
    private String delFlag;
    /** 宠物名（联表） */
    private String petName;
    /** 宠物图片（联表） */
    private String image;
    /** 品种（联表） */
    private String breed;
    /** 年龄（联表） */
    private String age;
    /** 分类名（联表） */
    private String categoryName;
    /** 售价（联表） */
    private BigDecimal price;

    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }

    public Long getPetId() { return petId; }
    public void setPetId(Long petId) { this.petId = petId; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getRelation() { return relation; }
    public void setRelation(String relation) { this.relation = relation; }

    public Date getStartTime() { return startTime; }
    public void setStartTime(Date startTime) { this.startTime = startTime; }

    public Date getEndTime() { return endTime; }
    public void setEndTime(Date endTime) { this.endTime = endTime; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public String getPetName() { return petName; }
    public void setPetName(String petName) { this.petName = petName; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }

    public String getAge() { return age; }
    public void setAge(String age) { this.age = age; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
