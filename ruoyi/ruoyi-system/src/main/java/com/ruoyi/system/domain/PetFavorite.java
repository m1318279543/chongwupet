package com.ruoyi.system.domain;
import jakarta.validation.constraints.NotBlank;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.annotation.Excel.ColumnType;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 收藏管理表 pet_favorite
 *
 * @author ruoyi
 */
public class PetFavorite extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 收藏管理ID */
    @Excel(name = "收藏管理ID", cellType = ColumnType.NUMERIC)
    private Long favoriteId;

    /** 用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 宠物ID */
    @Excel(name = "宠物ID")
    private Long petId;

    /** 用户名（关联 sys_user 查询展示用，非本表字段） */
    @Excel(name = "用户名")
    private String userName;

    /** 宠物名称（关联 pet_info 查询展示用，非本表字段） */
    @Excel(name = "宠物名称")
    private String petName;

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

    public Long getFavoriteId()
    {
        return favoriteId;
    }

    public void setFavoriteId(Long favoriteId)
    {
        this.favoriteId = favoriteId;
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

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("favoriteId", getFavoriteId())
            .append("userId", getUserId())
            .append("petId", getPetId())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("remark", getRemark())
            .toString();
    }
}
