package com.ruoyi.system.domain;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 站内消息通知对象 pet_notification
 *
 * @author ruoyi
 */
public class PetNotification extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 通知ID */
    private Long notifyId;

    /** 接收用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 接收用户账号（冗余） */
    @Excel(name = "用户账号")
    private String userName;

    /** 类型（order/appointment/consult/system） */
    @Excel(name = "类型", readConverterExp = "order=订单,appointment=预约,consult=咨询,system=系统")
    private String type;

    /** 标题 */
    @Excel(name = "标题")
    private String title;

    /** 内容 */
    @Excel(name = "内容")
    private String content;

    /** 关联业务ID */
    private Long refId;

    /** 是否已读（0未读 1已读） */
    @Excel(name = "是否已读", readConverterExp = "0=未读,1=已读")
    private String isRead;

    public Long getNotifyId() { return notifyId; }
    public void setNotifyId(Long notifyId) { this.notifyId = notifyId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Long getRefId() { return refId; }
    public void setRefId(Long refId) { this.refId = refId; }

    public String getIsRead() { return isRead; }
    public void setIsRead(String isRead) { this.isRead = isRead; }
}
