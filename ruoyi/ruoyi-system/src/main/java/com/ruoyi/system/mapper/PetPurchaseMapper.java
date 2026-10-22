package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetPurchase;
import com.ruoyi.system.domain.PetPurchaseItem;

/**
 * 采购单 数据层
 *
 * @author ruoyi
 */
public interface PetPurchaseMapper
{
    public List<PetPurchase> selectPetPurchaseList(PetPurchase purchase);

    public PetPurchase selectPetPurchaseByNo(String purchaseNo);

    public List<PetPurchaseItem> selectItemsByPurchaseNo(String purchaseNo);

    public List<PetPurchaseItem> selectItemsByPurchaseIds(List<Long> purchaseIds);

    public int insertPetPurchase(PetPurchase purchase);

    public int insertPetPurchaseItem(PetPurchaseItem item);

    public int updatePetPurchase(PetPurchase purchase);

    /** 入库时回写明细的实际入库前库存 */
    public int updateItemStockBefore(PetPurchaseItem item);

    /** 今日概览：待入库、今日入库额 */
    public Map<String, Object> selectTodayStats(Long storeId, String date);
}
