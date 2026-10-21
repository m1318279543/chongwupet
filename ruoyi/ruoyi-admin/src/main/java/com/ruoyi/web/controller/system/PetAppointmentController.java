package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.service.IPetAppointmentService;
import com.ruoyi.system.service.IPetNotificationService;

/**
 * 预约管理 Controller
 *
 * 权限说明：前台登录用户可以提交预约、查看/取消自己的预约；
 * 导出等管理类操作仍需要后台权限标识。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/appointment")
public class PetAppointmentController extends BaseController
{
    @Autowired
    private IPetAppointmentService petAppointmentService;

    @Autowired
    private IPetNotificationService petNotificationService;

    /** 预约状态 -> 中文 */
    private static String statusText(String status)
    {
        if ("1".equals(status)) return "已确认";
        if ("2".equals(status)) return "已完成";
        if ("3".equals(status)) return "已取消";
        return "待处理";
    }

    /**
     * 查询预约列表：管理员看全部，普通用户只看自己的
     */
    @GetMapping("/list")
    public TableDataInfo list(PetAppointment petAppointment)
    {
        if (!SecurityUtils.isAdmin())
        {
            petAppointment.setUserId(SecurityUtils.getUserId());
        }
        startPage();
        List<PetAppointment> list = petAppointmentService.selectPetAppointmentList(petAppointment);
        return getDataTable(list);
    }

    @PreAuthorize("@ss.hasPermi('pet:appointment:export')")
    @Log(title = "预约管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetAppointment petAppointment)
    {
        List<PetAppointment> list = petAppointmentService.selectPetAppointmentList(petAppointment);
        ExcelUtil<PetAppointment> util = new ExcelUtil<PetAppointment>(PetAppointment.class);
        util.exportExcel(response, list, "预约管理数据");
    }

    /**
     * 预约详情：普通用户只能查看自己的预约
     */
    @GetMapping(value = "/{appointmentId}")
    public AjaxResult getInfo(@PathVariable("appointmentId") Long appointmentId)
    {
        PetAppointment appointment = petAppointmentService.selectPetAppointmentByAppointmentId(appointmentId);
        if (appointment == null)
        {
            return error("预约记录不存在");
        }
        if (!SecurityUtils.isAdmin() && (appointment.getUserId() == null || !appointment.getUserId().equals(SecurityUtils.getUserId())))
        {
            return error("没有权限查看该预约记录");
        }
        return success(appointment);
    }

    /**
     * 新增预约：登录即可，普通用户自动归属当前账号
     */
    @Log(title = "预约管理", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetAppointment petAppointment)
    {
        if (!SecurityUtils.isAdmin() || petAppointment.getUserId() == null)
        {
            petAppointment.setUserId(SecurityUtils.getUserId());
        }
        if (petAppointment.getStatus() == null || petAppointment.getStatus().isEmpty())
        {
            petAppointment.setStatus("0");
        }
        return toAjax(petAppointmentService.insertPetAppointment(petAppointment));
    }

    /**
     * 修改预约（取消预约等）：普通用户只能改自己的
     */
    @Log(title = "预约管理", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetAppointment petAppointment)
    {
        PetAppointment origin = petAppointmentService.selectPetAppointmentByAppointmentId(petAppointment.getAppointmentId());
        if (!SecurityUtils.isAdmin())
        {
            if (origin == null || origin.getUserId() == null || !origin.getUserId().equals(SecurityUtils.getUserId()))
            {
                return error("只能修改自己的预约");
            }
            petAppointment.setUserId(origin.getUserId());
        }
        int rows = petAppointmentService.updatePetAppointment(petAppointment);
        // 管理员改状态时给预约人发站内通知
        if (rows > 0 && origin != null && SecurityUtils.isAdmin()
                && StringUtils.isNotBlank(petAppointment.getStatus())
                && !petAppointment.getStatus().equals(origin.getStatus()))
        {
            String st = petAppointment.getStatus();
            petNotificationService.push(origin.getUserId(), origin.getUserName(), "appointment",
                    "预约" + statusText(st),
                    "你预约看宠「" + (origin.getPetName() == null ? "" : origin.getPetName()) + "」的记录状态已更新为「"
                            + statusText(st) + "」" + ("2".equals(st) ? "，感谢你的信任，期待毛孩子到家 🐾" : "，可到「我的预约」查看详情。"),
                    origin.getAppointmentId());
        }
        return toAjax(rows);
    }

    /**
     * 取消预约：登录用户只能取消自己的预约，并写入取消记录供后台查看
     */
    @Log(title = "预约管理", businessType = BusinessType.UPDATE)
    @PostMapping("/cancel/{appointmentId}")
    public AjaxResult cancel(@PathVariable("appointmentId") Long appointmentId,
                             @RequestParam(value = "reason", required = false) String reason)
    {
        PetAppointment origin = petAppointmentService.selectPetAppointmentByAppointmentId(appointmentId);
        if (origin == null)
        {
            return error("预约记录不存在");
        }
        if (!SecurityUtils.isAdmin()
                && (origin.getUserId() == null || !origin.getUserId().equals(SecurityUtils.getUserId())))
        {
            return error("只能取消自己的预约");
        }
        boolean byAdmin = SecurityUtils.isAdmin() && !SecurityUtils.getUserId().equals(origin.getUserId());
        petAppointmentService.cancelPetAppointment(appointmentId, reason);
        petNotificationService.push(origin.getUserId(), origin.getUserName(), "appointment",
                byAdmin ? "预约已被管理员取消" : "预约已取消",
                "你预约看宠「" + (origin.getPetName() == null ? "" : origin.getPetName()) + "」的记录已取消"
                        + (StringUtils.isNotBlank(reason) ? "，原因：" + reason : "") + "。",
                appointmentId);
        return success("预约已取消");
    }

    /**
     * 删除预约：普通用户只能删自己的
     */
    @Log(title = "预约管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{appointmentIds}")
    public AjaxResult remove(@PathVariable Long[] appointmentIds)
    {
        if (!SecurityUtils.isAdmin())
        {
            Long currentUserId = SecurityUtils.getUserId();
            for (Long appointmentId : appointmentIds)
            {
                PetAppointment appointment = petAppointmentService.selectPetAppointmentByAppointmentId(appointmentId);
                if (appointment == null || appointment.getUserId() == null || !appointment.getUserId().equals(currentUserId))
                {
                    return error("只能删除自己的预约");
                }
            }
        }
        return toAjax(petAppointmentService.deletePetAppointmentByAppointmentIds(appointmentIds));
    }
}
