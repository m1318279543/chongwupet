package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetPurchase;

/**
 * 采购 服务层
 *
 * @author ruoyi
 */
public interface IPetPurchaseService
{
    public List<PetPurchase> selectPetPurchaseList(PetPurchase purchase);

    /** 采购单详情（含明细） */
    public PetPurchase selectPetPurchaseByNo(String purchaseNo);

    /**
     * 新建采购单。
     * 明细只需 goodsId + qty + costPrice，商品名称与规格由服务端快照，
     * 避免前端改价或商品改名后对不上账。
     */
    public PetPurchase createPurchase(PetPurchase purchase, String operator);

    /** 确认入库：逐条加库存并写流水（change_type=1），单据置已入库 */
    public int inbound(String purchaseNo, String operator);

    /** 取消采购单（只有待入库能取消） */
    public int cancel(String purchaseNo, String operator);

    /** 今日概览：待入库单数、今日入库额、低库存商品数 */
    public Map<String, Object> selectTodayStats(Long storeId);
}
