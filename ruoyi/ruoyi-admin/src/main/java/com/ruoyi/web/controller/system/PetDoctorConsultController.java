package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetDoctorConsult;
import com.ruoyi.system.service.IPetDoctorConsultService;

/**
 * 宠物医生咨询记录 Controller
 *
 * 前台「宠物医生智能问答」(/pet/issue/doctor/ask) 每次提问都会写入 pet_doctor_consult，
 * 后台（自研后台 + RuoYi 原生后台）可查看客户咨询过的问题与系统回答。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/doctor/consult")
public class PetDoctorConsultController extends BaseController
{
    @Autowired
    private IPetDoctorConsultService petDoctorConsultService;

    /** 咨询记录列表（后台） */
    @PreAuthorize("@ss.hasPermi('pet:doctor:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetDoctorConsult petDoctorConsult)
    {
        startPage();
        List<PetDoctorConsult> list = petDoctorConsultService.selectPetDoctorConsultList(petDoctorConsult);
        return getDataTable(list);
    }

    /** 导出咨询记录 */
    @PreAuthorize("@ss.hasPermi('pet:doctor:export')")
    @Log(title = "医生咨询记录", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetDoctorConsult petDoctorConsult)
    {
        List<PetDoctorConsult> list = petDoctorConsultService.selectPetDoctorConsultList(petDoctorConsult);
        ExcelUtil<PetDoctorConsult> util = new ExcelUtil<PetDoctorConsult>(PetDoctorConsult.class);
        util.exportExcel(response, list, "医生咨询记录");
    }

    /** 清空全部咨询记录（精确路径优先于 /{consultIds}） */
    @PreAuthorize("@ss.hasPermi('pet:doctor:remove')")
    @Log(title = "医生咨询记录", businessType = BusinessType.CLEAN)
    @DeleteMapping("/clean")
    public AjaxResult clean()
    {
        petDoctorConsultService.cleanPetDoctorConsult();
        return success("已清空咨询记录");
    }

    /** 批量删除咨询记录 */
    @PreAuthorize("@ss.hasPermi('pet:doctor:remove')")
    @Log(title = "医生咨询记录", businessType = BusinessType.DELETE)
    @DeleteMapping("/{consultIds}")
    public AjaxResult remove(@PathVariable Long[] consultIds)
    {
        return toAjax(petDoctorConsultService.deletePetDoctorConsultByConsultIds(consultIds));
    }
}
