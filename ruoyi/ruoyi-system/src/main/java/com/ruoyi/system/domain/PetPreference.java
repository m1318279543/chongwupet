package com.ruoyi.system.domain;

import java.util.Date;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 宠物喜好对象 pet_preference
 * 记录每只宠物的饮食/玩具/性格/环境偏好与禁忌，详情页与后台可维护
 *
 * @author ruoyi
 */
public class PetPreference extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 喜好ID */
    private Long preferenceId;

    /** 宠物ID */
    @Excel(name = "宠物ID")
    private Long petId;

    /** 喜欢的食物 */
    @Excel(name = "喜欢的食物")
    private String foodLike;

    /** 喜欢的玩具 */
    @Excel(name = "喜欢的玩具")
    private String toyLike;

    /** 性格特点 */
    @Excel(name = "性格特点")
    private String personality;

    /** 活跃度（高/中/低） */
    @Excel(name = "活跃度")
    private String activityLevel;

    /** 喜欢的环境 */
    @Excel(name = "喜欢的环境")
    private String envLike;

    /** 禁忌/注意事项 */
    @Excel(name = "禁忌注意事项")
    private String taboo;

    /** 备注 */
    @Excel(name = "备注")
    private String note;

    /** 状态（0正常 1停用） */
    @Excel(name = "状态", readConverterExp = "0=正常,1=停用")
    private String status;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    // ===== 关联展示字段（非本表列） =====
    private String petName;
    private String breed;
    private String image;
    private Long categoryId;

    public Long getPreferenceId() { return preferenceId; }
    public void setPreferenceId(Long preferenceId) { this.preferenceId = preferenceId; }

    public Long getPetId() { return petId; }
    public void setPetId(Long petId) { this.petId = petId; }

    public String getFoodLike() { return foodLike; }
    public void setFoodLike(String foodLike) { this.foodLike = foodLike; }

    public String getToyLike() { return toyLike; }
    public void setToyLike(String toyLike) { this.toyLike = toyLike; }

    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }

    public String getActivityLevel() { return activityLevel; }
    public void setActivityLevel(String activityLevel) { this.activityLevel = activityLevel; }

    public String getEnvLike() { return envLike; }
    public void setEnvLike(String envLike) { this.envLike = envLike; }

    public String getTaboo() { return taboo; }
    public void setTaboo(String taboo) { this.taboo = taboo; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public String getPetName() { return petName; }
    public void setPetName(String petName) { this.petName = petName; }

    public String getBreed() { return breed; }
    public void setBreed(String breed) { this.breed = breed; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
}
