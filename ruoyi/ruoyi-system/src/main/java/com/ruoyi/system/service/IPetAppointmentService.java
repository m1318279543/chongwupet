package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetAppointment;

/**
 * 预约管理 服务层
 *
 * @author ruoyi
 */
public interface IPetAppointmentService
{
    public List<PetAppointment> selectPetAppointmentList(PetAppointment petAppointment);

    public PetAppointment selectPetAppointmentByAppointmentId(Long appointmentId);

    public int insertPetAppointment(PetAppointment petAppointment);

    public int updatePetAppointment(PetAppointment petAppointment);

    public int deletePetAppointmentByAppointmentIds(Long[] appointmentIds);

    public int deletePetAppointmentByAppointmentId(Long appointmentId);

    /**
     * 取消预约：把预约状态置为已取消（3），并写入取消记录
     */
    public void cancelPetAppointment(Long appointmentId, String reason);
}
