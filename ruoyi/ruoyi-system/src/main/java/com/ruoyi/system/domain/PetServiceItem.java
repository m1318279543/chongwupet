package com.ruoyi.system.domain;

import java.math.BigDecimal;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 服务项目 pet_service_item
 *
 * @author ruoyi
 */
public class PetServiceItem extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 项目ID */
    private Long itemId;

    /** 项目名称 */
    @Excel(name = "项目名称")
    private String itemName;

    /** 类型（1洗护 2美容 3寄养 4医疗 5训练 6接待） */
    @Excel(name = "类型", readConverterExp = "1=洗护,2=美容,3=寄养,4=医疗,5=训练,6=接待")
    private String itemType;

    /** 标准价 */
    @Excel(name = "标准价")
    private BigDecimal price;

    /** 标准时长（分钟） */
    @Excel(name = "时长(分钟)")
    private Integer duration;

    /** 限定门店（NULL=通用） */
    private Long storeId;

    /** 门店名称（关联查询，非本表字段） */
    private String storeName;

    /** 排序 */
    private Integer sort;

    /** 状态（0上架 1下架） */
    @Excel(name = "状态", readConverterExp = "0=上架,1=下架")
    private String status;

    /** 删除标志（0存在 2删除） */
    private String delFlag;

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getDuration() { return duration; }
    public void setDuration(Integer duration) { this.duration = duration; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public Integer getSort() { return sort; }
    public void setSort(Integer sort) { this.sort = sort; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }
}
