package com.ruoyi.system.domain;
import java.util.Date;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物医生咨询记录 pet_doctor_consult
 * 前台「宠物医生智能问答」每次提问都会落一条记录，供后台查看咨询过的问题。
 *
 * @author ruoyi
 */
public class PetDoctorConsult extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 咨询记录ID */
    @Excel(name = "记录ID", cellType = com.ruoyi.common.annotation.Excel.ColumnType.NUMERIC)
    private Long consultId;

    /** 提问用户ID（游客为空） */
    @Excel(name = "用户ID")
    private Long userId;

    /** 提问人（游客为「游客」） */
    @Excel(name = "提问人")
    private String userName;

    /** 用户提问 */
    @Excel(name = "提问内容")
    private String question;

    /** 医生/AI 回答 */
    @Excel(name = "医生回答")
    private String answer;

    /** 回答来源 online/error */
    @Excel(name = "回答来源")
    private String source;

    /** 模型名 */
    @Excel(name = "模型")
    private String model;

    /** 命中知识库条数 */
    @Excel(name = "命中知识条目")
    private Integer matchCount;

    /** 来源IP */
    @Excel(name = "来源IP")
    private String ip;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    /** 提问时间（非本表 create_time 字段，供前端覆盖展示） */
    private Date consultTime;

    public Long getConsultId() { return consultId; }
    public void setConsultId(Long consultId) { this.consultId = consultId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public Integer getMatchCount() { return matchCount; }
    public void setMatchCount(Integer matchCount) { this.matchCount = matchCount; }

    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public Date getConsultTime() { return consultTime; }
    public void setConsultTime(Date consultTime) { this.consultTime = consultTime; }

    @Override
    public String toString() {
        return new ToStringBuilder(this, ToStringStyle.MULTI_LINE_STYLE)
            .append("consultId", getConsultId())
            .append("userId", getUserId())
            .append("userName", getUserName())
            .append("question", getQuestion())
            .append("source", getSource())
            .append("model", getModel())
            .append("matchCount", getMatchCount())
            .append("ip", getIp())
            .append("createTime", getCreateTime())
            .toString();
    }
}
