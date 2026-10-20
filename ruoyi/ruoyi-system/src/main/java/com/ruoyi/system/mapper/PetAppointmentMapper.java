package com.ruoyi.system.mapper;

import java.util.List;
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
}
