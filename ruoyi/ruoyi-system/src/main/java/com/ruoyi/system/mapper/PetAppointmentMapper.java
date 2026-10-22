package com.ruoyi.system.mapper;

import java.util.Date;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetAppointment;

/**
 * 预约管理 数据层
 *
 * @author ruoyi
 */
public interface PetAppointmentMapper
{
    public List<PetAppointment> selectPetAppointmentList(PetAppointment petAppointment);

    public PetAppointment selectPetAppointmentByAppointmentId(Long appointmentId);

    public int insertPetAppointment(PetAppointment petAppointment);

    public int updatePetAppointment(PetAppointment petAppointment);

    public int deletePetAppointmentByAppointmentId(Long appointmentId);

    public int deletePetAppointmentByAppointmentIds(Long[] appointmentIds);

    /** 统计某门店某时段的已约数量（排除已取消） */
    public int countBookedSlot(@Param("storeId") Long storeId, @Param("slotStart") Date slotStart);
}
