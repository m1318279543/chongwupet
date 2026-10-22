package com.ruoyi.system.domain;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.annotation.Excel.ColumnType;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物信息表 pet_info
 *
 * @author ruoyi
 */
public class PetInfo extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 宠物信息ID */
    @Excel(name = "宠物信息ID", cellType = ColumnType.NUMERIC)
    private Long petId;

    /** 分类ID */
    @Excel(name = "分类ID")
    private Long categoryId;

    /** 所属门店 */
    private Long storeId;

    /** 宠物名称 */
    @Excel(name = "宠物名称")
    private String petName;

    /** 品种 */
    @Excel(name = "品种")
    private String breed;

    /** 年龄 */
    @Excel(name = "年龄")
    private String age;

    /** 性别(0公1母2未知) */
    @Excel(name = "性别", readConverterExp = "0=公,1=母,2=未知")
    private String gender;

    /** 价格 */
    @Excel(name = "价格")
    private java.math.BigDecimal price;

    /** 宠物图片URL */
    private String image;

    /** 状态(0在售1已售2下架) */
    @Excel(name = "状态", readConverterExp = "0=在售,1=已售,2=下架")
    private String status;

    /** 宠物描述 */
    private String description;

    /** 点赞数（冗余计数，pet_like 表实际行数） */
    private Integer likeCount;

    public Integer getLikeCount()
    {
        return likeCount;
    }

    public void setLikeCount(Integer likeCount)
    {
        this.likeCount = likeCount;
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

    public Long getCategoryId()
    {
        return categoryId;
    }

    public void setCategoryId(Long categoryId)
    {
        this.categoryId = categoryId;
    }

    @NotBlank(message = "宠物名称不能为空")

    public String getPetName()
    {
        return petName;
    }

    public void setPetName(String petName)
    {
        this.petName = petName;
    }

    public String getBreed()
    {
        return breed;
    }

    public void setBreed(String breed)
    {
        this.breed = breed;
    }

    public String getAge()
    {
        return age;
    }

    public void setAge(String age)
    {
        this.age = age;
    }

    public String getGender()
    {
        return gender;
    }

    public void setGender(String gender)
    {
        this.gender = gender;
    }

    public java.math.BigDecimal getPrice()
    {
        return price;
    }

    public void setPrice(java.math.BigDecimal price)
    {
        this.price = price;
    }

    public String getImage()
    {
        return image;
    }

    public void setImage(String image)
    {
        this.image = image;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getDescription()
    {
        return description;
    }

    public void setDescription(String description)
    {
        this.description = description;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("petId", getPetId())
            .append("categoryId", getCategoryId())
            .append("petName", getPetName())
            .append("breed", getBreed())
            .append("age", getAge())
            .append("gender", getGender())
            .append("price", getPrice())
            .append("image", getImage())
            .append("status", getStatus())
            .append("description", getDescription())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("remark", getRemark())
            .toString();
    }
}
