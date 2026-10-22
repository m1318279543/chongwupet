package com.ruoyi.system.domain;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.ruoyi.common.annotation.Excel;
import com.ruoyi.common.core.domain.BaseEntity;

/**
 * 采购单 pet_purchase
 *
 * 状态：0待入库 1已入库 2已取消
 *
 * @author ruoyi
 */
public class PetPurchase extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    private Long purchaseId;

    @Excel(name = "采购单号")
    private String purchaseNo;

    private Long storeId;

    @Excel(name = "门店")
    private String storeName;

    @Excel(name = "供应商")
    private String supplier;

    @Excel(name = "状态", readConverterExp = "0=待入库,1=已入库,2=已取消")
    private String status;

    @Excel(name = "商品种数")
    private Integer itemCount;

    @Excel(name = "采购件数")
    private Integer totalQty;

    @Excel(name = "采购金额")
    private BigDecimal totalAmount;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private Date expectTime;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date inboundTime;

    private String inboundBy;

    @Excel(name = "备注")
    private String remark;

    /** 明细 */
    private List<PetPurchaseItem> items = new ArrayList<>();

    /** 查询辅助：关键词（采购单号/供应商） */
    private String keyword;

    /** 查询辅助：日期 */
    private String queryDate;

    public Long getPurchaseId() { return purchaseId; }
    public void setPurchaseId(Long purchaseId) { this.purchaseId = purchaseId; }

    public String getPurchaseNo() { return purchaseNo; }
    public void setPurchaseNo(String purchaseNo) { this.purchaseNo = purchaseNo; }

    public Long getStoreId() { return storeId; }
    public void setStoreId(Long storeId) { this.storeId = storeId; }

    public String getStoreName() { return storeName; }
    public void setStoreName(String storeName) { this.storeName = storeName; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getItemCount() { return itemCount; }
    public void setItemCount(Integer itemCount) { this.itemCount = itemCount; }

    public Integer getTotalQty() { return totalQty; }
    public void setTotalQty(Integer totalQty) { this.totalQty = totalQty; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public Date getExpectTime() { return expectTime; }
    public void setExpectTime(Date expectTime) { this.expectTime = expectTime; }

    public Date getInboundTime() { return inboundTime; }
    public void setInboundTime(Date inboundTime) { this.inboundTime = inboundTime; }

    public String getInboundBy() { return inboundBy; }
    public void setInboundBy(String inboundBy) { this.inboundBy = inboundBy; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }

    public List<PetPurchaseItem> getItems() { return items; }
    public void setItems(List<PetPurchaseItem> items) { this.items = items; }

    public String getKeyword() { return keyword; }
    public void setKeyword(String keyword) { this.keyword = keyword; }

    public String getQueryDate() { return queryDate; }
    public void setQueryDate(String queryDate) { this.queryDate = queryDate; }
}
