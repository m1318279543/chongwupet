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
import com.ruoyi.system.domain.PetCancelRecord;
import com.ruoyi.system.service.IPetCancelRecordService;

/**
 * 预约/订单取消记录 Controller
 *
 * 前台用户取消预约(/pet/appointment/cancel)、取消订单(/pet/cart/cancel)时会写入 pet_cancel_record，
 * 后台（自研后台 + RuoYi 原生后台）可查看全部取消记录。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/cancel")
public class PetCancelRecordController extends BaseController
{
    @Autowired
    private IPetCancelRecordService petCancelRecordService;

    /** 取消记录列表（后台） */
    @PreAuthorize("@ss.hasPermi('pet:cancel:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetCancelRecord petCancelRecord)
    {
        startPage();
        List<PetCancelRecord> list = petCancelRecordService.selectPetCancelRecordList(petCancelRecord);
        return getDataTable(list);
    }

    /** 导出取消记录 */
    @PreAuthorize("@ss.hasPermi('pet:cancel:export')")
    @Log(title = "取消记录", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetCancelRecord petCancelRecord)
    {
        List<PetCancelRecord> list = petCancelRecordService.selectPetCancelRecordList(petCancelRecord);
        ExcelUtil<PetCancelRecord> util = new ExcelUtil<PetCancelRecord>(PetCancelRecord.class);
        util.exportExcel(response, list, "取消记录");
    }

    /** 清空全部取消记录（精确路径优先于 /{recordIds}） */
    @PreAuthorize("@ss.hasPermi('pet:cancel:remove')")
    @Log(title = "取消记录", businessType = BusinessType.CLEAN)
    @DeleteMapping("/clean")
    public AjaxResult clean()
    {
        petCancelRecordService.cleanPetCancelRecord();
        return success("已清空取消记录");
    }

    /** 批量删除取消记录 */
    @PreAuthorize("@ss.hasPermi('pet:cancel:remove')")
    @Log(title = "取消记录", businessType = BusinessType.DELETE)
    @DeleteMapping("/{recordIds}")
    public AjaxResult remove(@PathVariable Long[] recordIds)
    {
        return toAjax(petCancelRecordService.deletePetCancelRecordByRecordIds(recordIds));
    }
}
