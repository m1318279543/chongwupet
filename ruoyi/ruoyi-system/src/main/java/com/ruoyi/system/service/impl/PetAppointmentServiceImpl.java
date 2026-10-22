package com.ruoyi.system.service.impl;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.domain.PetCancelRecord;
import com.ruoyi.system.mapper.PetAppointmentMapper;
import com.ruoyi.system.service.IPetAppointmentService;
import com.ruoyi.system.service.IPetCancelRecordService;

/**
 * 预约管理 服务层实现
 *
 * @author ruoyi
 */
@Service
public class PetAppointmentServiceImpl implements IPetAppointmentService
{
    @Autowired
    private PetAppointmentMapper petAppointmentMapper;

    @Autowired
    private IPetCancelRecordService petCancelRecordService;

    @Override
    public List<PetAppointment> selectPetAppointmentList(PetAppointment petAppointment)
    {
        return petAppointmentMapper.selectPetAppointmentList(petAppointment);
    }

    @Override
    public PetAppointment selectPetAppointmentByAppointmentId(Long appointmentId)
    {
        return petAppointmentMapper.selectPetAppointmentByAppointmentId(appointmentId);
    }

    /** 门店每天开放的可约时段 */
    private static final String[] SLOTS = { "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00" };

    /** 每个时段的接待上限（演示值，后续可挪到门店配置） */
    private static final int SLOT_CAPACITY = 3;

    @Override
    public List<Map<String, Object>> selectSlots(Long storeId, String date)
    {
        List<Map<String, Object>> list = new ArrayList<>();
        if (storeId == null || StringUtils.isBlank(date))
        {
            return list;
        }
        for (String slot : SLOTS)
        {
            Date start;
            try
            {
                start = Timestamp.valueOf(date + " " + slot + ":00");
            }
            catch (Exception e)
            {
                continue;
            }
            int booked = petAppointmentMapper.countBookedSlot(storeId, start);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("slot", slot);
            item.put("booked", booked);
            item.put("capacity", SLOT_CAPACITY);
            item.put("available", Math.max(0, SLOT_CAPACITY - booked));
            list.add(item);
        }
        return list;
    }

    @Override
    public int insertPetAppointment(PetAppointment petAppointment)
    {
        // 容量校验：同一门店同一时段最多 SLOT_CAPACITY 单
        if (petAppointment.getStoreId() != null && petAppointment.getAppointmentDate() != null)
        {
            int booked = petAppointmentMapper.countBookedSlot(petAppointment.getStoreId(), petAppointment.getAppointmentDate());
            if (booked >= SLOT_CAPACITY)
            {
                throw new ServiceException("该时段已约满，请选择其他时段");
            }
        }
        return petAppointmentMapper.insertPetAppointment(petAppointment);
    }

    @Override
    public int updatePetAppointment(PetAppointment petAppointment)
    {
        return petAppointmentMapper.updatePetAppointment(petAppointment);
    }

    @Override
    public int deletePetAppointmentByAppointmentIds(Long[] appointmentIds)
    {
        return petAppointmentMapper.deletePetAppointmentByAppointmentIds(appointmentIds);
    }

    @Override
    public int deletePetAppointmentByAppointmentId(Long appointmentId)
    {
        return petAppointmentMapper.deletePetAppointmentByAppointmentId(appointmentId);
    }

    @Override
    @Transactional
    public void cancelPetAppointment(Long appointmentId, String reason)
    {
        PetAppointment apt = petAppointmentMapper.selectPetAppointmentByAppointmentId(appointmentId);
        if (apt == null)
        {
            throw new ServiceException("预约记录不存在或已被删除");
        }
        if ("3".equals(apt.getStatus()))
        {
            throw new ServiceException("该预约已取消，无需重复操作");
        }
        if ("2".equals(apt.getStatus()))
        {
            throw new ServiceException("预约已完成，无法取消");
        }
        // 1. 预约状态置为已取消（3）
        PetAppointment update = new PetAppointment();
        update.setAppointmentId(appointmentId);
        update.setStatus("3");
        petAppointmentMapper.updatePetAppointment(update);
        // 2. 写入取消记录
        PetCancelRecord record = new PetCancelRecord();
        record.setTargetType("appointment");
        record.setRefId(appointmentId);
        record.setUserId(apt.getUserId());
        record.setUserName(apt.getUserName());
        record.setTargetName(apt.getPetName());
        record.setDetail(buildAppointmentDetail(apt));
        record.setReason(reason == null ? "" : reason);
        petCancelRecordService.insertPetCancelRecord(record);
    }

    /** 组装预约明细快照 */
    private String buildAppointmentDetail(PetAppointment apt)
    {
        StringBuilder sb = new StringBuilder();
        if (apt.getAppointmentDate() != null)
        {
            sb.append("预约时间：")
              .append(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(apt.getAppointmentDate()))
              .append("；");
        }
        if (apt.getContactPhone() != null && !apt.getContactPhone().isEmpty())
        {
            sb.append("联系电话：").append(apt.getContactPhone()).append("；");
        }
        if (apt.getPetId() != null)
        {
            sb.append("宠物ID：").append(apt.getPetId());
        }
        return sb.toString();
    }
}
