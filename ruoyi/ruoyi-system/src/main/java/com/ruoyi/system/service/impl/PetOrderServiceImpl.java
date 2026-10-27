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
import com.ruoyi.system.domain.PetCancelRecord;
import com.ruoyi.system.domain.PetCart;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetGoodsSku;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.domain.PetOrderItem;
import com.ruoyi.system.mapper.PetInfoMapper;
import com.ruoyi.system.mapper.PetOrderMapper;
import com.ruoyi.system.service.IPetCancelRecordService;
import com.ruoyi.system.service.IPetCustomerService;
import com.ruoyi.system.service.IPetGoodsService;
import com.ruoyi.system.service.IPetOrderService;

/**
 * 订单 服务层实现
 *
 * 订单是交易的唯一真值：
 *   - 价格、名称、规格在创建时快照，后台改价不影响历史单；
 *   - 支付用带条件的 UPDATE 保证幂等（重复点击只会成功一次）；
 *   - 取消时按明细回补库存，并写库存流水与取消记录。
 *
 * @author ruoyi
 */
@Service
public class PetOrderServiceImpl implements IPetOrderService
{
    @Autowired
    private PetOrderMapper petOrderMapper;

    @Autowired
    private IPetGoodsService petGoodsService;

    @Autowired
    private IPetCustomerService petCustomerService;

    @Autowired
    private IPetCancelRecordService petCancelRecordService;

    @Autowired
    private PetInfoMapper petInfoMapper;

    @Override
    public List<PetOrder> selectPetOrderList(PetOrder order)
    {
        List<PetOrder> list = petOrderMapper.selectPetOrderList(order);
        fillItems(list);
        return list;
    }

    @Override
    public PetOrder selectPetOrderByNo(String orderNo)
    {
        PetOrder order = petOrderMapper.selectPetOrderByNo(orderNo);
        if (order != null)
        {
            order.setItems(petOrderMapper.selectItemsByOrderNo(orderNo));
        }
        return order;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PetOrder createOrder(List<PetCart> items, Long userId, String userName)
    {
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("购物车为空，无法提交");
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        String orderNo = genOrderNo();

        PetOrder order = new PetOrder();
        order.setOrderNo(orderNo);
        order.setOrderType("1");
        order.setUserId(userId);
        order.setUserName(userName);
        order.setCustomerId(customer == null ? null : customer.getCustomerId());
        order.setStoreId(customer == null || customer.getStoreId() == null ? 1L : customer.getStoreId());
        order.setPayStatus("0");
        order.setStatus("0");
        order.setDeliveryType("1");
        order.setCreateBy(userName);

        List<PetOrderItem> lines = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int count = 0;
        for (PetCart row : items)
        {
            PetGoods goods = resolveGoods(row);
            if (goods == null)
            {
                throw new ServiceException("「" + row.getGoodsName() + "」已下架或不存在，请移除后重新下单");
            }
            if ("1".equals(goods.getStatus()))
            {
                throw new ServiceException("「" + goods.getGoodsName() + "」已下架，请移除后重新下单");
            }
            PetGoodsSku sku = row.getSkuId() == null ? null : petGoodsService.selectSkuById(row.getSkuId());
            if (sku != null && !goods.getGoodsId().equals(sku.getGoodsId()))
            {
                sku = null;
            }
            BigDecimal price = petGoodsService.resolvePrice(goods, sku);
            int qty = row.getQty() == null || row.getQty() < 1 ? 1 : row.getQty();
            BigDecimal amount = price.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);

            PetOrderItem line = new PetOrderItem();
            line.setOrderNo(orderNo);
            line.setItemType("1");
            line.setGoodsId(goods.getGoodsId());
            line.setSkuId(sku == null ? null : sku.getSkuId());
            line.setGoodsName(goods.getGoodsName());
            line.setGoodsImage(goods.getImage());
            line.setGoodsSpec(sku != null && StringUtils.isNotBlank(sku.getSpec()) ? sku.getSpec() : goods.getSpec());
            line.setPrice(price);
            line.setQty(qty);
            line.setAmount(amount);
            lines.add(line);

            total = total.add(amount);
            count += qty;
        }

        order.setItemCount(count);
        order.setTotalAmount(total);
        order.setPayAmount(total);
        petOrderMapper.insertPetOrder(order);

        for (PetOrderItem line : lines)
        {
            line.setOrderId(order.getOrderId());
            petOrderMapper.insertPetOrderItem(line);
            // 下单只校验库存是否够（真正扣减在支付时），不足则整单回滚
            petGoodsService.checkStock(line.getGoodsId(), line.getSkuId(), line.getQty(), line.getGoodsName());
        }
        order.setItems(lines);
        return order;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PetOrder createPetOrder(Long petId, Long userId, String userName)
    {
        if (petId == null)
        {
            throw new ServiceException("请选择要购买的宠物");
        }
        PetInfo pet = petInfoMapper.selectPetInfoByPetId(petId);
        if (pet == null)
        {
            throw new ServiceException("宠物不存在或已下架");
        }
        if (!"0".equals(pet.getStatus()))
        {
            throw new ServiceException("「" + pet.getPetName() + "」已经被订走了，看看其他小伙伴吧");
        }
        // CAS 占位：只有「在售」才更新成功，两人同时下单只会有一个成功
        if (petInfoMapper.lockPet(petId) == 0)
        {
            throw new ServiceException("手慢了，「" + pet.getPetName() + "」刚被其他人订走");
        }

        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        String orderNo = genOrderNo();
        BigDecimal price = pet.getPrice() == null ? BigDecimal.ZERO : pet.getPrice();

        PetOrder order = new PetOrder();
        order.setOrderNo(orderNo);
        order.setOrderType("2");
        order.setUserId(userId);
        order.setUserName(userName);
        order.setCustomerId(customer == null ? null : customer.getCustomerId());
        order.setStoreId(pet.getStoreId() != null ? pet.getStoreId()
                : (customer == null || customer.getStoreId() == null ? 1L : customer.getStoreId()));
        order.setPayStatus("0");
        order.setStatus("0");
        // 活体只能到店自提，不做物流
        order.setDeliveryType("1");
        order.setItemCount(1);
        order.setTotalAmount(price);
        order.setPayAmount(price);
        order.setCreateBy(userName);
        petOrderMapper.insertPetOrder(order);

        PetOrderItem line = new PetOrderItem();
        line.setOrderId(order.getOrderId());
        line.setOrderNo(orderNo);
        line.setItemType("2");
        line.setPetId(petId);
        line.setGoodsName(pet.getPetName());
        line.setGoodsImage(pet.getImage());
        line.setGoodsSpec(pet.getBreed());
        line.setPrice(price);
        line.setQty(1);
        line.setAmount(price);
        petOrderMapper.insertPetOrderItem(line);

        List<PetOrderItem> lines = new ArrayList<>();
        lines.add(line);
        order.setItems(lines);
        return order;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int payOrder(String orderNo, String payMethod, String operator)
    {
        PetOrder order = petOrderMapper.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if ("3".equals(order.getStatus()))
        {
            throw new ServiceException("订单已取消，无法支付");
        }
        int rows = petOrderMapper.payOrder(orderNo, StringUtils.isBlank(payMethod) ? "alipay" : payMethod);
        if (rows == 0)
        {
            // 并发或重复点击：已经付过就当成功处理，避免前端报错
            PetOrder latest = petOrderMapper.selectPetOrderByNo(orderNo);
            if (latest != null && "1".equals(latest.getPayStatus()))
            {
                return 0;
            }
            throw new ServiceException("订单当前状态不可支付");
        }
        // 支付成功才真正扣减商品库存（下单时只校验未扣），宠物单在下单时已置「已售」无需处理
        List<PetOrderItem> payItems = petOrderMapper.selectItemsByOrderNo(orderNo);
        for (PetOrderItem item : payItems)
        {
            if (!"1".equals(item.getItemType()) || item.getGoodsId() == null)
            {
                continue;
            }
            int qty = item.getQty() == null || item.getQty() < 1 ? 1 : item.getQty();
            try
            {
                petGoodsService.changeStock(item.getGoodsId(), item.getSkuId(), "2", qty,
                        operator, orderNo, "订单支付出库");
            }
            catch (ServiceException e)
            {
                // 库存不足：抛出后整个支付事务回滚（余额由 Controller 侧退款）
                throw new ServiceException("「" + item.getGoodsName() + "」" + e.getMessage());
            }
        }
        return rows;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelOrder(String orderNo, String reason, String operator)
    {
        PetOrder order = petOrderMapper.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if ("3".equals(order.getStatus()))
        {
            throw new ServiceException("订单已取消，无需重复操作");
        }
        if ("2".equals(order.getStatus()))
        {
            throw new ServiceException("订单已完成，无法取消");
        }
        List<PetOrderItem> items = petOrderMapper.selectItemsByOrderNo(orderNo);
        // 回补库存：只有已支付订单在支付时真正扣过库存，取消才回补；未支付订单下单时未扣库存
        boolean paid = "1".equals(order.getPayStatus());
        for (PetOrderItem item : items)
        {
            // 宠物单：取消即把宠物放回「在售」，让下一个人能买
            if ("2".equals(item.getItemType()))
            {
                if (item.getPetId() != null)
                {
                    petInfoMapper.releasePet(item.getPetId());
                }
                continue;
            }
            if (!paid || item.getGoodsId() == null)
            {
                continue;
            }
            try
            {
                petGoodsService.changeStock(item.getGoodsId(), item.getSkuId(), "3", item.getQty(),
                        operator, orderNo, "订单取消回补");
            }
            catch (Exception ignored)
            {
                // 商品可能已删除，不阻断取消
            }
        }

        PetOrder update = new PetOrder();
        update.setOrderNo(orderNo);
        update.setStatus("3");
        update.setCancelReason(reason);
        update.setCancelTime(new Date());
        update.setUpdateBy(operator);
        int rows = petOrderMapper.updatePetOrder(update);

        PetCancelRecord record = new PetCancelRecord();
        record.setTargetType("order");
        record.setRefId(order.getOrderId());
        record.setUserId(order.getUserId());
        record.setUserName(order.getUserName());
        record.setTargetName(orderNo);
        record.setDetail("订单金额 ¥" + order.getPayAmount() + "，共 " + order.getItemCount() + " 件");
        record.setReason(reason == null ? "" : reason);
        record.setCreateBy(operator);
        petCancelRecordService.insertPetCancelRecord(record);
        return rows;
    }

    @Override
    public int shipOrder(String orderNo, String operator)
    {
        PetOrder order = petOrderMapper.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if (!"1".equals(order.getStatus()))
        {
            throw new ServiceException("只有已支付待发货的订单可以发货");
        }
        PetOrder update = new PetOrder();
        update.setOrderNo(orderNo);
        update.setStatus("2");
        update.setUpdateBy(operator);
        return petOrderMapper.updatePetOrder(update);
    }

    @Override
    public int deletePetOrderByNos(String[] orderNos)
    {
        return petOrderMapper.deletePetOrderByNos(orderNos);
    }

    @Override
    public List<PetOrder> selectMyOrders(Long userId)
    {
        PetOrder query = new PetOrder();
        query.setUserId(userId);
        return selectPetOrderList(query);
    }

    @Override
    public Map<String, Object> selectTodayStats(Long storeId)
    {
        String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        List<Map<String, Object>> rows = petOrderMapper.selectTodayStats(storeId, today);
        Map<String, Object> stats = new LinkedHashMap<>();
        Map<String, Object> row = rows.isEmpty() ? new LinkedHashMap<>() : rows.get(0);
        stats.put("total", number(row.get("cnt")));
        stats.put("paid", row.get("paid") == null ? BigDecimal.ZERO : row.get("paid"));
        stats.put("unpaid", number(row.get("unpaid")));
        stats.put("toShip", number(row.get("toShip")));
        stats.put("date", today);
        return stats;
    }

    private int number(Object v)
    {
        return v == null ? 0 : ((Number) v).intValue();
    }

    /** 列表带上明细，前端一单多品不用二次请求 */
    private void fillItems(List<PetOrder> orders)
    {
        if (orders == null || orders.isEmpty())
        {
            return;
        }
        List<Long> ids = new ArrayList<>();
        for (PetOrder o : orders)
        {
            ids.add(o.getOrderId());
        }
        List<PetOrderItem> items = petOrderMapper.selectItemsByOrderIds(ids);
        Map<Long, List<PetOrderItem>> map = new LinkedHashMap<>();
        for (PetOrderItem item : items)
        {
            map.computeIfAbsent(item.getOrderId(), k -> new ArrayList<>()).add(item);
        }
        for (PetOrder o : orders)
        {
            o.setItems(map.getOrDefault(o.getOrderId(), new ArrayList<>()));
        }
    }

    /** 定位商品：优先 goodsId，兼容旧购物车里的商品名 */
    private PetGoods resolveGoods(PetCart row)
    {
        if (row.getGoodsId() != null)
        {
            PetGoods goods = petGoodsService.selectPetGoodsById(row.getGoodsId());
            if (goods != null && !"2".equals(goods.getDelFlag()))
            {
                return goods;
            }
        }
        if (StringUtils.isBlank(row.getGoodsName()))
        {
            return null;
        }
        PetGoods query = new PetGoods();
        query.setGoodsName(row.getGoodsName());
        for (PetGoods goods : petGoodsService.selectPetGoodsList(query))
        {
            if (goods.getGoodsName().equals(row.getGoodsName()))
            {
                return goods;
            }
        }
        return null;
    }

    private String genOrderNo()
    {
        return "ORD" + new SimpleDateFormat("yyyyMMddHHmmss").format(new Date())
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }
}
