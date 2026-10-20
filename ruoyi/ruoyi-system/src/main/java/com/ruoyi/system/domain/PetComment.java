package com.ruoyi.system.domain;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物评论表 pet_comment
 * 支持回复：parent_id 指向被回复的评论ID（0=顶级评论），reply_user 冗余被回复人昵称
 *
 * @author ruoyi
 */
public class PetComment extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 评论ID */
    @Excel(name = "评论ID")
    private Long commentId;

    /** 宠物ID / 目标ID（宠物或宠物粮，由 targetType 区分） */
    @Excel(name = "目标ID")
    private Long petId;

    /** 目标类型：pet=宠物，food=宠物粮（默认 pet） */
    @Excel(name = "目标类型")
    private String targetType;

    /** 评论用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 父评论ID（0=顶级评论） */
    private Long parentId;

    /** 被回复人昵称（冗余展示） */
    private String replyUser;

    /** 评论内容 */
    @Excel(name = "评论内容")
    private String content;

    /** 状态（0正常 1隐藏） */
    @Excel(name = "状态", readConverterExp = "0=正常,1=隐藏")
    private String status;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    /** 用户名（关联 sys_user 查询展示用，非本表字段） */
    @Excel(name = "用户名")
    private String userName;

    /** 用户头像（关联 sys_user 查询展示用，非本表字段） */
    private String avatar;

    /** 宠物名称（关联 pet_info 查询展示用，非本表字段） */
    @Excel(name = "宠物名称")
    private String petName;

    /** 宠物图片（关联 pet_info 查询展示用，非本表字段） */
    private String image;

    public Long getCommentId()
    {
        return commentId;
    }

    public void setCommentId(Long commentId)
    {
        this.commentId = commentId;
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

    public Long getParentId()
    {
        return parentId;
    }

    public void setParentId(Long parentId)
    {
        this.parentId = parentId;
    }

    public String getReplyUser()
    {
        return replyUser;
    }

    public void setReplyUser(String replyUser)
    {
        this.replyUser = replyUser;
    }

    public String getContent()
    {
        return content;
    }

    public void setContent(String content)
    {
        this.content = content;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getUserName()
    {
        return userName;
    }

    public void setUserName(String userName)
    {
        this.userName = userName;
    }

    public String getAvatar()
    {
        return avatar;
    }

    public void setAvatar(String avatar)
    {
        this.avatar = avatar;
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

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("commentId", getCommentId())
            .append("petId", getPetId())
            .append("targetType", getTargetType())
            .append("userId", getUserId())
            .append("parentId", getParentId())
            .append("content", getContent())
            .append("status", getStatus())
            .append("createTime", getCreateTime())
            .toString();
    }
}
