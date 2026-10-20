package com.ruoyi.system.domain;
import java.io.Serializable;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 宠物点赞表 pet_like
 * 一人一宠只能点赞一次（uk_user_pet 唯一索引保证）
 *
 * @author ruoyi
 */
public class PetLike implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 点赞ID */
    private Long likeId;

    /** 宠物ID / 目标ID（宠物或宠物粮，由 targetType 区分） */
    private Long petId;

    /** 目标类型：pet=宠物，food=宠物粮（默认 pet） */
    private String targetType;

    /** 点赞用户ID */
    private Long userId;

    /** 点赞时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date createTime;

    /** 用户名（关联 sys_user 查询展示用，非本表字段） */
    private String userName;

    /** 宠物名称（关联 pet_info 查询展示用，非本表字段） */
    private String petName;

    /** 宠物图片（关联 pet_info 查询展示用，非本表字段） */
    private String image;

    public Long getLikeId()
    {
        return likeId;
    }

    public void setLikeId(Long likeId)
    {
        this.likeId = likeId;
    }

    public Long getPetId()
    {
        return petId;
    }

    public void setPetId(Long petId)
    {
        this.petId = petId;
    }

    public String getTargetType()
    {
        return targetType;
    }

    public void setTargetType(String targetType)
    {
        this.targetType = targetType;
    }

    public Long getUserId()
    {
        return userId;
    }

    public void setUserId(Long userId)
    {
        this.userId = userId;
    }

    public Date getCreateTime()
    {
        return createTime;
    }

    public void setCreateTime(Date createTime)
    {
        this.createTime = createTime;
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

    public String getImage()
    {
        return image;
    }

    public void setImage(String image)
    {
        this.image = image;
    }
}
