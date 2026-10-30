package com.ruoyi.system.domain;

import java.io.Serializable;
import java.util.Date;

import com.ruoyi.common.core.domain.BaseEntity;

/**
 * AI 会话 实体
 *
 * 继承 BaseEntity 以获得 params 查询映射（日期范围 / 关键词等后台筛选）。
 *
 * @author ruoyi
 */
public class PetAiConversation extends BaseEntity implements Serializable
{
    private static final long serialVersionUID = 1L;

    private Long convId;
    private String convNo;
    private Long userId;
    private String userName;
    private String scene;
    /** 首问意图分类：goods/order_list/knowledge...，后台咨询记录按此分门别类 */
    private String intent;
    private String bizId;
    private String title;
    private Long storeId;
    private Integer messageCount;
    private Date lastTime;
    private String status;
    private Date createTime;
    private Date updateTime;

    public Long getConvId()
    {
        return convId;
    }

    public void setConvId(Long convId)
    {
        this.convId = convId;
    }

    public String getConvNo()
    {
        return convNo;
    }

    public void setConvNo(String convNo)
    {
        this.convNo = convNo;
    }

    public Long getUserId()
    {
        return userId;
    }

    public void setUserId(Long userId)
    {
        this.userId = userId;
    }

    public String getUserName()
    {
        return userName;
    }

    public void setUserName(String userName)
    {
        this.userName = userName;
    }

    public String getScene()
    {
        return scene;
    }

    public void setScene(String scene)
    {
        this.scene = scene;
    }

    public String getIntent()
    {
        return intent;
    }

    public void setIntent(String intent)
    {
        this.intent = intent;
    }

    public String getBizId()
    {
        return bizId;
    }

    public void setBizId(String bizId)
    {
        this.bizId = bizId;
    }

    public String getTitle()
    {
        return title;
    }

    public void setTitle(String title)
    {
        this.title = title;
    }

    public Long getStoreId()
    {
        return storeId;
    }

    public void setStoreId(Long storeId)
    {
        this.storeId = storeId;
    }

    public Integer getMessageCount()
    {
        return messageCount;
    }

    public void setMessageCount(Integer messageCount)
    {
        this.messageCount = messageCount;
    }

    public Date getLastTime()
    {
        return lastTime;
    }

    public void setLastTime(Date lastTime)
    {
        this.lastTime = lastTime;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public Date getCreateTime()
    {
        return createTime;
    }

    public void setCreateTime(Date createTime)
    {
        this.createTime = createTime;
    }

    public Date getUpdateTime()
    {
        return updateTime;
    }

    public void setUpdateTime(Date updateTime)
    {
        this.updateTime = updateTime;
    }
}
