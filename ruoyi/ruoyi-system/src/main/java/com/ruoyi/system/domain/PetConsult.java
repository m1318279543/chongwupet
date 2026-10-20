package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 客服咨询对象 pet_consult
 * 用户提交问题，后台客服回复；用户在「联系客服」查看自己的咨询与回复
 *
 * @author ruoyi
 */
public class PetConsult extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 咨询ID */
    private Long consultId;

    /** 用户ID */
    @Excel(name = "用户ID")
    private Long userId;

    /** 用户名 */
    @Excel(name = "用户名")
    private String userName;

    /** 联系方式 */
    @Excel(name = "联系方式")
    private String contact;

    /** 咨询问题 */
    @Excel(name = "咨询问题")
    private String question;

    /** 客服回复 */
    @Excel(name = "客服回复")
    private String reply;

    /** 回复人 */
    @Excel(name = "回复人")
    private String replyBy;

    /** 回复时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "回复时间", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date replyTime;

    /** 状态（0待回复 1已回复） */
    @Excel(name = "状态", readConverterExp = "0=待回复,1=已回复")
    private String status;

    /** 删除标志 */
    private String delFlag;

    public Long getConsultId() { return consultId; }
    public void setConsultId(Long consultId) { this.consultId = consultId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getContact() { return contact; }
    public void setContact(String contact) { this.contact = contact; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }

    public String getReplyBy() { return replyBy; }
    public void setReplyBy(String replyBy) { this.replyBy = replyBy; }

    public Date getReplyTime() { return replyTime; }
    public void setReplyTime(Date replyTime) { this.replyTime = replyTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
}
