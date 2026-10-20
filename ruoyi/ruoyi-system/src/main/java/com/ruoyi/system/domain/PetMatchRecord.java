package com.ruoyi.system.domain;

import com.ruoyi.common.core.domain.BaseEntity;

/**
 * AI 宠物匹配问卷记录
 *
 * @author ruoyi
 */
public class PetMatchRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long recordId;
    private Long userId;
    private String userName;
    /** 问卷答案 JSON */
    private String answers;
    private Long topPetId;
    private String topPetName;
    private Double topScore;
    /** 推荐结果概览 */
    private String resultPets;
    /** 推荐明细 JSON */
    private String resultDetail;
    /** 匹配状态（0=有匹配结果，1=没有匹配到宠物） */
    private String matchStatus;
    /** 无匹配诊断 JSON（各条件淘汰数 / 缺口价位 / 建议） */
    private String diagnosis;
    private String algorithm;
    private String delFlag;

    public Long getRecordId()
    {
        return recordId;
    }

    public void setRecordId(Long recordId)
    {
        this.recordId = recordId;
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

    public String getAnswers()
    {
        return answers;
    }

    public void setAnswers(String answers)
    {
        this.answers = answers;
    }

    public Long getTopPetId()
    {
        return topPetId;
    }

    public void setTopPetId(Long topPetId)
    {
        this.topPetId = topPetId;
    }

    public String getTopPetName()
    {
        return topPetName;
    }

    public void setTopPetName(String topPetName)
    {
        this.topPetName = topPetName;
    }

    public Double getTopScore()
    {
        return topScore;
    }

    public void setTopScore(Double topScore)
    {
        this.topScore = topScore;
    }

    public String getResultPets()
    {
        return resultPets;
    }

    public void setResultPets(String resultPets)
    {
        this.resultPets = resultPets;
    }

    public String getResultDetail()
    {
        return resultDetail;
    }

    public void setResultDetail(String resultDetail)
    {
        this.resultDetail = resultDetail;
    }

    public String getMatchStatus()
    {
        return matchStatus;
    }

    public void setMatchStatus(String matchStatus)
    {
        this.matchStatus = matchStatus;
    }

    public String getDiagnosis()
    {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis)
    {
        this.diagnosis = diagnosis;
    }

    public String getAlgorithm()
    {
        return algorithm;
    }

    public void setAlgorithm(String algorithm)
    {
        this.algorithm = algorithm;
    }

    public String getDelFlag()
    {
        return delFlag;
    }

    public void setDelFlag(String delFlag)
    {
        this.delFlag = delFlag;
    }
}
