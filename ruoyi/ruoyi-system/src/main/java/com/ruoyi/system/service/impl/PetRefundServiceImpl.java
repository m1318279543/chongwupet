package com.ruoyi.system.service.impl;

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
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.domain.PetOrderItem;
import com.ruoyi.system.domain.PetRefund;
import com.ruoyi.system.mapper.PetInfoMapper;
import com.ruoyi.system.mapper.PetOrderMapper;
import com.ruoyi.system.mapper.PetRefundMapper;
import com.ruoyi.system.service.IPetGoodsService;
import com.ruoyi.system.service.IPetRefundService;

/**
 * 退款 服务层实现
 *
 * 售后链路：申请 → 待审核 →（同意）退款到账 + 订单关闭 + 库存退还
 *                              →（拒绝）保留订单，写审核意见
 *
 * 演示环境是模拟支付，所以「同意」即视为退款成功，不再对接支付网关。
 *
 * @author ruoyi
 */
@Service
public class PetRefundServiceImpl implements IPetRefundService
{
    @Autowired
    private PetRefundMapper petRefundMapper;

    @Autowired
    private PetOrderMapper petOrderMapper;

    @Autowired
    private PetInfoMapper petInfoMapper;

    @Autowired
    private IPetGoodsService petGoodsService;

    @Override
    public List<PetRefund> selectPetRefundList(PetRefund refund)
    {
        return petRefundMapper.selectPetRefundList(refund);
    }

    @Override
    public PetRefund selectPetRefundById(Long refundId)
    {
        return petRefundMapper.selectPetRefundById(refundId);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PetRefund apply(String orderNo, String reason, Long userId, String userName)
    {
        PetOrder order = petOrderMapper.selectPetOrderByNo(orderNo);
        if (order == null)
        {
            throw new ServiceException("订单不存在");
        }
        if (order.getUserId() == null || !order.getUserId().equals(userId))
        {
            throw new ServiceException("只能对自己的订单申请退款");
        }
        if ("2".equals(order.getPayStatus()))
        {
            throw new ServiceException("该订单已退款，无需重复申请");
        }
        if (!"1".equals(order.getPayStatus()))
        {
            throw new ServiceException("只有已支付的订单可以申请退款");
        }
        if ("3".equals(order.getStatus()))
        {
            throw new ServiceException("订单已取消，无需退款");
        }
        if (petRefundMapper.countPendingByOrderNo(orderNo) > 0)
        {
            throw new ServiceException("退款申请已提交，请等待门店审核");
        }

        PetRefund refund = new PetRefund();
        refund.setRefundNo(genRefundNo());
        refund.setOrderNo(orderNo);
        refund.setOrderId(order.getOrderId());
        refund.setStoreId(order.getStoreId());
        refund.setUserId(order.getUserId());
        refund.setUserName(order.getUserName());
        refund.setAmount(order.getPayAmount());
        refund.setReason(StringUtils.isBlank(reason) ? "用户申请退款" : reason);
        refund.setStatus("0");
        refund.setRefundMethod(order.getPayMethod());
        refund.setCreateBy(userName);
        petRefundMapper.insertPetRefund(refund);
        return refund;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int audit(Long refundId, boolean pass, String remark, String operator)
    {
        PetRefund refund = petRefundMapper.selectPetRefundById(refundId);
        if (refund == null)
        {
            throw new ServiceException("退款单不存在");
        }
        if (!"0".equals(refund.getStatus()))
        {
            throw new ServiceException("该退款单已处理，不能重复审核");
        }

        PetRefund update = new PetRefund();
        update.setRefundId(refundId);
        update.setAuditBy(operator);
        update.setAuditTime(new Date());
        update.setAuditRemark(remark);
        update.setUpdateBy(operator);

        if (!pass)
        {
            update.setStatus("2");
            return petRefundMapper.updatePetRefund(update);
        }

        PetOrder order = petOrderMapper.selectPetOrderByNo(refund.getOrderNo());
        if (order == null)
        {
            throw new ServiceException("订单不存在，无法退款");
        }
        if (!"1".equals(order.getPayStatus()))
        {
            throw new ServiceException("订单当前不是已支付状态，无法退款");
        }

        // 退还库存：商品加回去，宠物放回在售
        List<PetOrderItem> items = petOrderMapper.selectItemsByOrderNo(refund.getOrderNo());
        for (PetOrderItem item : items)
        {
            if ("2".equals(item.getItemType()))
            {
                if (item.getPetId() != null)
                {
                    petInfoMapper.releasePet(item.getPetId());
                }
                continue;
            }
            if (item.getGoodsId() == null)
            {
                continue;
            }
            try
            {
                petGoodsService.changeStock(item.getGoodsId(), item.getSkuId(), "5", item.getQty(),
                        operator, refund.getRefundNo(), "退款退货入库");
            }
            catch (Exception ignored)
            {
                // 商品可能已删除，不阻断退款
            }
        }

        // 订单置「已退款 + 已取消」，金额留快照
        PetOrder orderUpdate = new PetOrder();
        orderUpdate.setOrderNo(refund.getOrderNo());
        orderUpdate.setPayStatus("2");
        orderUpdate.setStatus("3");
        orderUpdate.setCancelReason("退款：" + (refund.getReason() == null ? "" : refund.getReason()));
        orderUpdate.setCancelTime(new Date());
        orderUpdate.setUpdateBy(operator);
        petOrderMapper.updatePetOrder(orderUpdate);

        update.setStatus("1");
        update.setFinishTime(new Date());
        return petRefundMapper.updatePetRefund(update);
    }

    @Override
    public List<PetRefund> selectMyRefunds(Long userId)
    {
        PetRefund query = new PetRefund();
        query.setUserId(userId);
        return petRefundMapper.selectPetRefundList(query);
    }

    @Override
    public Map<String, Object> selectTodayStats(Long storeId)
    {
        String today = new SimpleDateFormat("yyyy-MM-dd").format(new Date());
        Map<String, Object> row = petRefundMapper.selectTodayStats(storeId, today);
        Map<String, Object> stats = new LinkedHashMap<>();
        if (row == null)
        {
            row = new LinkedHashMap<>();
        }
        stats.put("pending", number(row.get("pending")));
        stats.put("refunded", row.get("refunded") == null ? 0 : row.get("refunded"));
        stats.put("done", number(row.get("done")));
        stats.put("rejected", number(row.get("rejected")));
        stats.put("date", today);
        return stats;
    }

    private int number(Object v)
    {
        return v == null ? 0 : ((Number) v).intValue();
    }

    private String genRefundNo()
    {
        return "RF" + new SimpleDateFormat("yyyyMMddHHmmss").format(new Date())
                + String.format("%03d", ThreadLocalRandom.current().nextInt(1000));
    }
}
