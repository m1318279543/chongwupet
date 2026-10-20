package com.ruoyi.system.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物健康与服务档案对象 pet_health
 * 前台「健康筛查/真实信息/专业养护/售后无忧」四个页面的数据来源，后台可维护
 *
 * @author ruoyi
 */
public class PetHealth extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 档案ID */
    private Long healthId;

    /** 宠物ID */
    @Excel(name = "宠物ID")
    private Long petId;

    /** 档案编号（一宠一档） */
    @Excel(name = "档案编号")
    private String archiveNo;

    /** 疫苗名称 */
    @Excel(name = "疫苗名称")
    private String vaccineName;

    /** 疫苗进度，如 3/3 */
    @Excel(name = "疫苗进度")
    private String vaccineProgress;

    /** 最近接种日期 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "接种日期", width = 30, dateFormat = "yyyy-MM-dd")
    private Date vaccineDate;

    /** 驱虫用药 */
    @Excel(name = "驱虫用药")
    private String dewormName;

    /** 驱虫日期 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "驱虫日期", width = 30, dateFormat = "yyyy-MM-dd")
    private Date dewormDate;

    /** 体检项目 */
    @Excel(name = "体检项目")
    private String examItems;

    /** 体检结论 */
    @Excel(name = "体检结论")
    private String examResult;

    /** 体检日期 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "体检日期", width = 30, dateFormat = "yyyy-MM-dd")
    private Date examDate;

    /** 体检机构 */
    @Excel(name = "体检机构")
    private String examHospital;

    /** 遗传病排查项 */
    @Excel(name = "遗传病排查")
    private String geneticScreen;

    /** 健康等级（优秀/良好/观察中） */
    @Excel(name = "健康等级")
    private String healthLevel;

    /** 健康备注 */
    @Excel(name = "健康备注")
    private String healthNote;

    /** 来源渠道 */
    @Excel(name = "来源渠道")
    private String sourceChannel;

    /** 来源地 */
    @Excel(name = "来源地")
    private String sourcePlace;

    /** 父本 */
    @Excel(name = "父本")
    private String fatherInfo;

    /** 母本 */
    @Excel(name = "母本")
    private String motherInfo;

    /** 出生日期 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "出生日期", width = 30, dateFormat = "yyyy-MM-dd")
    private Date birthDate;

    /** 是否实拍（0是 1否） */
    @Excel(name = "是否实拍", readConverterExp = "0=是,1=否")
    private String isPhotoReal;

    /** 性格特点 */
    @Excel(name = "性格特点")
    private String temperament;

    /** 喂养方案 */
    @Excel(name = "喂养方案")
    private String feedPlan;

    /** 护理要点 */
    @Excel(name = "护理要点")
    private String carePoints;

    /** 饲养难度 */
    @Excel(name = "饲养难度")
    private String skillLevel;

    /** 健康保障天数 */
    @Excel(name = "保障天数")
    private Integer guaranteeDays;

    /** 购宠合同编号 */
    @Excel(name = "合同编号")
    private String contractNo;

    /** 送达方式 */
    @Excel(name = "送达方式")
    private String deliverySupport;

    /** 售后说明 */
    @Excel(name = "售后说明")
    private String aftersaleNote;

    /** 状态（0正常 1停用） */
    @Excel(name = "状态", readConverterExp = "0=正常,1=停用")
    private String status;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    // ===== 关联展示字段（非本表列） =====
    /** 宠物名称 */
    private String petName;
    /** 宠物品种 */
    private String breed;
    /** 宠物图片 */
    private String image;
    /** 分类ID */
    private Long categoryId;
    /** 宠物售价 */
    private java.math.BigDecimal price;

    public Long getHealthId()
    {
        return healthId;
    }

    public void setHealthId(Long healthId)
    {
        this.healthId = healthId;
    }

    public Long getPetId()
    {
        return petId;
    }

    public void setPetId(Long petId)
    {
        this.petId = petId;
    }

    public String getArchiveNo()
    {
        return archiveNo;
    }

    public void setArchiveNo(String archiveNo)
    {
        this.archiveNo = archiveNo;
    }

    public String getVaccineName()
    {
        return vaccineName;
    }

    public void setVaccineName(String vaccineName)
    {
        this.vaccineName = vaccineName;
    }

    public String getVaccineProgress()
    {
        return vaccineProgress;
    }

    public void setVaccineProgress(String vaccineProgress)
    {
        this.vaccineProgress = vaccineProgress;
    }

    public Date getVaccineDate()
    {
        return vaccineDate;
    }

    public void setVaccineDate(Date vaccineDate)
    {
        this.vaccineDate = vaccineDate;
    }

    public String getDewormName()
    {
        return dewormName;
    }

    public void setDewormName(String dewormName)
    {
        this.dewormName = dewormName;
    }

    public Date getDewormDate()
    {
        return dewormDate;
    }

    public void setDewormDate(Date dewormDate)
    {
        this.dewormDate = dewormDate;
    }

    public String getExamItems()
    {
        return examItems;
    }

    public void setExamItems(String examItems)
    {
        this.examItems = examItems;
    }

    public String getExamResult()
    {
        return examResult;
    }

    public void setExamResult(String examResult)
    {
        this.examResult = examResult;
    }

    public Date getExamDate()
    {
        return examDate;
    }

    public void setExamDate(Date examDate)
    {
        this.examDate = examDate;
    }

    public String getExamHospital()
    {
        return examHospital;
    }

    public void setExamHospital(String examHospital)
    {
        this.examHospital = examHospital;
    }

    public String getGeneticScreen()
    {
        return geneticScreen;
    }

    public void setGeneticScreen(String geneticScreen)
    {
        this.geneticScreen = geneticScreen;
    }

    public String getHealthLevel()
    {
        return healthLevel;
    }

    public void setHealthLevel(String healthLevel)
    {
        this.healthLevel = healthLevel;
    }

    public String getHealthNote()
    {
        return healthNote;
    }

    public void setHealthNote(String healthNote)
    {
        this.healthNote = healthNote;
    }

    public String getSourceChannel()
    {
        return sourceChannel;
    }

    public void setSourceChannel(String sourceChannel)
    {
        this.sourceChannel = sourceChannel;
    }

    public String getSourcePlace()
    {
        return sourcePlace;
    }

    public void setSourcePlace(String sourcePlace)
    {
        this.sourcePlace = sourcePlace;
    }

    public String getFatherInfo()
    {
        return fatherInfo;
    }

    public void setFatherInfo(String fatherInfo)
    {
        this.fatherInfo = fatherInfo;
    }

    public String getMotherInfo()
    {
        return motherInfo;
    }

    public void setMotherInfo(String motherInfo)
    {
        this.motherInfo = motherInfo;
    }

    public Date getBirthDate()
    {
        return birthDate;
    }

    public void setBirthDate(Date birthDate)
    {
        this.birthDate = birthDate;
    }

    public String getIsPhotoReal()
    {
        return isPhotoReal;
    }

    public void setIsPhotoReal(String isPhotoReal)
    {
        this.isPhotoReal = isPhotoReal;
    }

    public String getTemperament()
    {
        return temperament;
    }

    public void setTemperament(String temperament)
    {
        this.temperament = temperament;
    }

    public String getFeedPlan()
    {
        return feedPlan;
    }

    public void setFeedPlan(String feedPlan)
    {
        this.feedPlan = feedPlan;
    }

    public String getCarePoints()
    {
        return carePoints;
    }

    public void setCarePoints(String carePoints)
    {
        this.carePoints = carePoints;
    }

    public String getSkillLevel()
    {
        return skillLevel;
    }

    public void setSkillLevel(String skillLevel)
    {
        this.skillLevel = skillLevel;
    }

    public Integer getGuaranteeDays()
    {
        return guaranteeDays;
    }

    public void setGuaranteeDays(Integer guaranteeDays)
    {
        this.guaranteeDays = guaranteeDays;
    }

    public String getContractNo()
    {
        return contractNo;
    }

    public void setContractNo(String contractNo)
    {
        this.contractNo = contractNo;
    }

    public String getDeliverySupport()
    {
        return deliverySupport;
    }

    public void setDeliverySupport(String deliverySupport)
    {
        this.deliverySupport = deliverySupport;
    }

    public String getAftersaleNote()
    {
        return aftersaleNote;
    }

    public void setAftersaleNote(String aftersaleNote)
    {
        this.aftersaleNote = aftersaleNote;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public String getDelFlag()
    {
        return delFlag;
    }

    public void setDelFlag(String delFlag)
    {
        this.delFlag = delFlag;
    }

    public String getPetName()
    {
        return petName;
    }

    public void setPetName(String petName)
    {
        this.petName = petName;
    }

    public String getBreed()
    {
        return breed;
    }

    public void setBreed(String breed)
    {
        this.breed = breed;
    }

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

    public java.math.BigDecimal getPrice()
    {
        return price;
    }

    public void setPrice(java.math.BigDecimal price)
    {
        this.price = price;
    }
}
