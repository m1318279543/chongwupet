package com.ruoyi.system.service;

import java.util.List;
import com.ruoyi.system.domain.PetDoctorConsult;

/**
 * 宠物医生咨询记录 服务层
 *
 * @author ruoyi
 */
public interface IPetDoctorConsultService
{
    /** 查询咨询记录列表 */
    public List<PetDoctorConsult> selectPetDoctorConsultList(PetDoctorConsult petDoctorConsult);

    /** 按ID查询 */
    public PetDoctorConsult selectPetDoctorConsultByConsultId(Long consultId);

    /** 新增咨询记录 */
    public int insertPetDoctorConsult(PetDoctorConsult petDoctorConsult);

    /** 批量删除 */
    public int deletePetDoctorConsultByConsultIds(Long[] consultIds);

    /** 清空全部咨询记录 */
    public int cleanPetDoctorConsult();
}
