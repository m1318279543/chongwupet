package com.ruoyi.system.domain;

import java.util.Date;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物常见健康问题（疑难杂症）知识库对象 pet_health_issue
 * 按科系/分类维护常见病症、症状、诱因、解决措施与预防，前台健康百科与宠物医生智能问答的数据来源
 *
 * @author ruoyi
 */
public class PetHealthIssue extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 问题ID */
    private Long issueId;

    /** 分类ID（关联 pet_category，可为空表示通用） */
    @Excel(name = "分类ID")
    private Long categoryId;

    /** 科系（猫科/犬科/兔科…用于按科系匹配） */
    @Excel(name = "科系")
    private String family;

    /** 问题名称 */
    @Excel(name = "问题名称")
    private String issueName;

    /** 症状表现 */
    @Excel(name = "症状")
    private String symptoms;

    /** 诱因/原因 */
    @Excel(name = "诱因")
    private String cause;

    /** 解决措施 */
    @Excel(name = "解决措施")
    private String solution;

    /** 预防要点 */
    @Excel(name = "预防")
    private String prevention;

    /** 严重程度（轻/中/重） */
    @Excel(name = "严重程度")
    private String severity;

    /** 显示顺序 */
    @Excel(name = "显示顺序")
    private Integer sort;

    /** 状态（0正常 1停用） */
    @Excel(name = "状态", readConverterExp = "0=正常,1=停用")
    private String status;

    /** 删除标志 */
    private String delFlag;

    // 关联展示
    private String categoryName;

    public Long getIssueId() { return issueId; }
    public void setIssueId(Long issueId) { this.issueId = issueId; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }

    public String getIssueName() { return issueName; }
    public void setIssueName(String issueName) { this.issueName = issueName; }

    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }

    public String getCause() { return cause; }
    public void setCause(String cause) { this.cause = cause; }

    public String getSolution() { return solution; }
    public void setSolution(String solution) { this.solution = solution; }

    public String getPrevention() { return prevention; }
    public void setPrevention(String prevention) { this.prevention = prevention; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public Integer getSort() { return sort; }
    public void setSort(Integer sort) { this.sort = sort; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
}
