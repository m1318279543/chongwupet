package com.ruoyi.system.domain;

import java.io.Serializable;
import java.util.Date;

/**
 * AI 会话消息 实体
 *
 * @author ruoyi
 */
public class PetAiMessage implements Serializable
{
    private static final long serialVersionUID = 1L;

    private Long msgId;
    private Long convId;
    private String role;
    private String content;
    private String blocksJson;
    private String citationsJson;
    private String actionsJson;
    private String toolNames;
    private Integer latencyMs;
    private Date createTime;

    public Long getMsgId()
    {
        return msgId;
    }

    public void setMsgId(Long msgId)
    {
        this.msgId = msgId;
    }

    public Long getConvId()
    {
        return convId;
    }

    public void setConvId(Long convId)
    {
        this.convId = convId;
    }

    public String getRole()
    {
        return role;
    }

    public void setRole(String role)
    {
        this.role = role;
    }

    public String getContent()
    {
        return content;
    }

    public void setContent(String content)
    {
        this.content = content;
    }

    public String getBlocksJson()
    {
        return blocksJson;
    }

    public void setBlocksJson(String blocksJson)
    {
        this.blocksJson = blocksJson;
    }

    public String getCitationsJson()
    {
        return citationsJson;
    }

    public void setCitationsJson(String citationsJson)
    {
        this.citationsJson = citationsJson;
    }

    public String getActionsJson()
    {
        return actionsJson;
    }

    public void setActionsJson(String actionsJson)
    {
        this.actionsJson = actionsJson;
    }

    public String getToolNames()
    {
        return toolNames;
    }

    public void setToolNames(String toolNames)
    {
        this.toolNames = toolNames;
    }

    public Integer getLatencyMs()
    {
        return latencyMs;
    }

    public void setLatencyMs(Integer latencyMs)
    {
        this.latencyMs = latencyMs;
    }

    public Date getCreateTime()
    {
        return createTime;
    }

    public void setCreateTime(Date createTime)
    {
        this.createTime = createTime;
    }
}
