package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 商品 pet_goods
 *
 * @author ruoyi
 */
public class PetGoods extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 商品ID */
    private Long goodsId;

    /** 商品编码（前台业务ID） */
    @Excel(name = "商品编码")
    private String goodsCode;

    /** 商品名称 */
    @Excel(name = "商品名称")
    private String goodsName;

    /** 适用宠物分类 */
    private String cat;

    /** 类型（1宠物粮 2用品 3玩具 4保健） */
    private String goodsType;

    /** 默认规格 */
    @Excel(name = "规格")
    private String spec;

    /** 售价 */
    @Excel(name = "售价")
    private BigDecimal price;

    /** 划线价 */
    private BigDecimal originPrice;

    /** 库存汇总 */
    @Excel(name = "库存")
    private Integer stock;

    /** 单位 */
    private String unit;

    /** 主图 */
    private String image;

    /** 适用阶段 */
    private String stage;

    /** 简介 */
    private String description;

    /** 卖点标签（逗号分隔） */
    private String tags;

    /** 营养指标 */
    private String nutrition;

    /** 喂食建议 */
    private String feeding;

    /** 储存方式 */
    private String storage;

    /** 状态（0上架 1下架） */
    @Excel(name = "状态", readConverterExp = "0=上架,1=下架")
    private String status;

    /** 排序 */
    private Integer sort;

    /** 删除标志 */
    private String delFlag;

    /** 查询辅助：关键字（名称/编码） */
    private String keyword;

    /** 查询辅助：库存预警阈值 */
    private Integer lowStock;

    /** SKU 列表（详情用，非本表字段） */
    private List<PetGoodsSku> skus = new ArrayList<>();

    /** 标签数组（前端直接可用） */
    public List<String> getTagList()
    {
        if (tags == null || tags.trim().isEmpty())
        {
            return new ArrayList<>();
        }
        return new ArrayList<>(Arrays.asList(tags.split(",")));
    }

    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }

    public String getGoodsCode() { return goodsCode; }
    public void setGoodsCode(String goodsCode) { this.goodsCode = goodsCode; }

    public String getGoodsName() { return goodsName; }
    public void setGoodsName(String goodsName) { this.goodsName = goodsName; }

    public String getCat() { return cat; }
    public void setCat(String cat) { this.cat = cat; }

    public String getGoodsType() { return goodsType; }
    public void setGoodsType(String goodsType) { this.goodsType = goodsType; }

    public String getSpec() { return spec; }
    public void setSpec(String spec) { this.spec = spec; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getOriginPrice() { return originPrice; }
    public void setOriginPrice(BigDecimal originPrice) { this.originPrice = originPrice; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getNutrition() { return nutrition; }
    public void setNutrition(String nutrition) { this.nutrition = nutrition; }

    public String getFeeding() { return feeding; }
    public void setFeeding(String feeding) { this.feeding = feeding; }

    public String getStorage() { return storage; }
    public void setStorage(String storage) { this.storage = storage; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSort() { return sort; }
    public void setSort(Integer sort) { this.sort = sort; }

    public String getDelFlag() { return delFlag; }
    public void setDelFlag(String delFlag) { this.delFlag = delFlag; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public Integer getLowStock() { return lowStock; }
    public void setLowStock(Integer lowStock) { this.lowStock = lowStock; }

    public List<PetGoodsSku> getSkus() { return skus; }
    public void setSkus(List<PetGoodsSku> skus) { this.skus = skus; }
}
