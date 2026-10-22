package com.ruoyi.system.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetPurchase;
import com.ruoyi.system.domain.PetPurchaseItem;
import com.ruoyi.system.mapper.PetPurchaseMapper;
import com.ruoyi.system.service.IPetGoodsService;
import com.ruoyi.system.service.IPetPurchaseService;

/**
 * 采购 服务层实现
 *
 * 闭环：低库存预警 → 建采购单 → 供应商送货 → 确认入库（加库存 + 写流水）
 *
 * @author ruoyi
 */
@Service
public class PetPurchaseServiceImpl implements IPetPurchaseService
{
    @Autowired
    private PetPurchaseMapper petPurchaseMapper;

    @Autowired
    private IPetGoodsService petGoodsService;

    @Override
    public List<PetPurchase> selectPetPurchaseList(PetPurchase purchase)
    {
        List<PetPurchase> list = petPurchaseMapper.selectPetPurchaseList(purchase);
        fillItems(list);
        return list;
    }

    @Override
    public PetPurchase selectPetPurchaseByNo(String purchaseNo)
    {
        PetPurchase purchase = petPurchaseMapper.selectPetPurchaseByNo(purchaseNo);
        if (purchase != null)
        {
            purchase.setItems(petPurchaseMapper.selectItemsByPurchaseNo(purchaseNo));
        }
        return purchase;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PetPurchase createPurchase(PetPurchase purchase, String operator)
    {
        if (purchase == null || purchase.getItems() == null || purchase.getItems().isEmpty())
        {
            throw new ServiceException("请至少添加一个采购商品");
        }
        String purchaseNo = genPurchaseNo();

        PetPurchase head = new PetPurchase();
        head.setPurchaseNo(purchaseNo);
        head.setStoreId(purchase.getStoreId());
        head.setSupplier(StringUtils.isBlank(purchase.getSupplier()) ? "默认供应商" : purchase.getSupplier());
        head.setStatus("0");
        head.setExpectTime(purchase.getExpectTime());
        head.setRemark(purchase.getRemark());
        head.setCreateBy(operator);

        List<PetPurchaseItem> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int totalQty = 0;
        for (PetPurchaseItem row : purchase.getItems())
        {
            if (row.getGoodsId() == null)
            {
                continue;
            }
            PetGoods goods = petGoodsService.selectPetGoodsById(row.getGoodsId());
            if (goods == null || "2".equals(goods.getDelFlag()))
            {
                throw new ServiceException("商品不存在或已删除，请刷新后重试");
            }
            int qty = row.getQty() == null || row.getQty() < 1 ? 1 : row.getQty();
            // 前端未填进价时用商品售价兜底，避免出现 0 元采购
            BigDecimal cost = row.getCostPrice() == null || row.getCostPrice().compareTo(BigDecimal.ZERO) <= 0
                    ? (goods.getPrice() == null ? BigDecimal.ZERO : goods.getPrice())
                    : row.getCostPrice();
            BigDecimal amount = cost.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);

            PetPurchaseItem line = new PetPurchaseItem();
            line.setPurchaseNo(purchaseNo);
            line.setGoodsId(goods.getGoodsId());
            line.setSkuId(row.getSkuId());
            line.setGoodsName(goods.getGoodsName());
            line.setGoodsImage(goods.getImage());
            line.setSpec(goods.getSpec());
            line.setCostPrice(cost);
            line.setQty(qty);
            line.setAmount(amount);
            lines.add(line);

            total = total.add(amount);
            totalQty += qty;
        }
        if (lines.isEmpty())
        {
            throw new ServiceException("请至少添加一个采购商品");
        }

        head.setItemCount(lines.size());
        head.setTotalQty(totalQty);
        head.setTotalAmount(total);
        petPurchaseMapper.insertPetPurchase(head);

        for (PetPurchaseItem line : lines)
        {
            line.setPurchaseId(head.getPurchaseId());
            petPurchaseMapper.insertPetPurchaseItem(line);
        }
        head.setItems(lines);
        return head;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int inbound(String purchaseNo, String operator)
    {
        PetPurchase purchase = petPurchaseMapper.selectPetPurchaseByNo(purchaseNo);
        if (purchase == null)
        {
            throw new ServiceException("采购单不存在");
        }
        if ("1".equals(purchase.getStatus()))
        {
            throw new ServiceException("该采购单已入库，无需重复操作");
        }
        if ("2".equals(purchase.getStatus()))
        {
            throw new ServiceException("采购单已取消，不能入库");
        }

        List<PetPurchaseItem> items = petPurchaseMapper.selectItemsByPurchaseNo(purchaseNo);
        if (items.isEmpty())
        {
            throw new ServiceException("采购单没有明细，无法入库");
        }
        for (PetPurchaseItem item : items)
        {
            // 逐条加库存并记流水（change_type=1 采购入库，biz_no 记采购单号）
            int after = petGoodsService.changeStock(item.getGoodsId(), item.getSkuId(), "1", item.getQty(),
                    operator, purchaseNo, "采购入库");
            item.setStockBefore(after - item.getQty());
            petPurchaseMapper.updateItemStockBefore(item);
        }

        PetPurchase update = new PetPurchase();
        update.setPurchaseNo(purchaseNo);
        update.setStatus("1");
        update.setInboundTime(new Date());
        update.setInboundBy(operator);
        update.setUpdateBy(operator);
        return petPurchaseMapper.updatePetPurchase(update);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancel(String purchaseNo, String operator)
    {
        PetPurchase purchase = petPurchaseMapper.selectPetPurchaseByNo(purchaseNo);
        if (purchase == null)
        {
            throw new ServiceException("采购单不存在");
        }
        if ("1".equals(purchase.getStatus()))
        {
            throw new ServiceException("已入库的采购单不能取消");
        }
        if ("2".equals(purchase.getStatus()))
        {
            throw new ServiceException("采购单已取消");
        }
        PetPurchase update = new PetPurchase();
        update.setPurchaseNo(purchaseNo);
        update.setStatus("2");
        update.setUpdateBy(operator);
        return petPurchaseMapper.updatePetPurchase(update);
    }

    @Override
    public Map<String, Object> selectTodayStats(Long storeId)
    {
        String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        Map<String, Object> row = petPurchaseMapper.selectTodayStats(storeId, today);
        Map<String, Object> stats = new LinkedHashMap<>();
        if (row == null)
        {
            row = new LinkedHashMap<>();
        }
        stats.put("pending", number(row.get("pending")));
        stats.put("inboundAmount", row.get("inboundAmount") == null ? 0 : row.get("inboundAmount"));
        stats.put("inboundCount", number(row.get("inboundCount")));
        stats.put("lowStock", number(row.get("lowStock")));
        stats.put("date", today);
        return stats;
    }

    private int number(Object v)
    {
        return v == null ? 0 : ((Number) v).intValue();
    }

    /** 列表带明细，前端展开就能看，不用二次请求 */
    private void fillItems(List<PetPurchase> purchases)
    {
        if (purchases == null || purchases.isEmpty())
        {
            return;
        }
        List<Long> ids = new ArrayList<>();
        for (PetPurchase p : purchases)
        {
            ids.add(p.getPurchaseId());
        }
        List<PetPurchaseItem> items = petPurchaseMapper.selectItemsByPurchaseIds(ids);
        Map<Long, List<PetPurchaseItem>> map = new LinkedHashMap<>();
        for (PetPurchaseItem item : items)
        {
            map.computeIfAbsent(item.getPurchaseId(), k -> new ArrayList<>()).add(item);
        }
        for (PetPurchase p : purchases)
        {
            p.setItems(map.getOrDefault(p.getPurchaseId(), new ArrayList<>()));
        }
    }

    private String genPurchaseNo()
    {
        return "CG" + new SimpleDateFormat("yyyyMMddHHmmss").format(new Date())
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }
}
