package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetHealth;
import com.ruoyi.system.service.IPetHealthService;

/**
 * 宠物健康与服务档案 Controller
 *
 * 前台游客可按宠物ID查看档案（/pet/health/{petId}）；后台增删改需要 pet:health:* 权限。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/health")
public class PetHealthController extends BaseController
{
    @Autowired
    private IPetHealthService petHealthService;

    /**
     * 后台：档案列表
     */
    @PreAuthorize("@ss.hasPermi('pet:health:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetHealth petHealth)
    {
        startPage();
        List<PetHealth> list = petHealthService.selectPetHealthList(petHealth);
        return getDataTable(list);
    }

    /**
     * 前台：按宠物ID查看健康档案（游客可读）
     */
    @GetMapping("/{petId}")
    public AjaxResult getByPetId(@PathVariable("petId") Long petId)
    {
        PetHealth health = petHealthService.selectPetHealthByPetId(petId);
        if (health == null)
        {
            // 尚未建档时返回空对象，前端自行降级展示
            return success(new PetHealth());
        }
        return success(health);
    }

    /**
     * 前台：在售宠物的健康档案汇总（服务页用）——仅在售且档案挂得上宠物
     */
    @GetMapping("/onsale")
    public AjaxResult onSaleList()
    {
        startPage();
        List<PetHealth> list = petHealthService.selectOnSaleHealthList();
        TableDataInfo info = getDataTable(list);
        return success(info);
    }

    /**
     * 后台：按档案ID查询
     */
    @PreAuthorize("@ss.hasPermi('pet:health:list')")
    @GetMapping("/detail/{healthId}")
    public AjaxResult getInfo(@PathVariable("healthId") Long healthId)
    {
        return success(petHealthService.selectPetHealthByHealthId(healthId));
    }

    /**
     * 后台：新增档案
     */
    @PreAuthorize("@ss.hasPermi('pet:health:add')")
    @Log(title = "健康档案", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetHealth petHealth)
    {
        petHealth.setCreateBy(SecurityUtils.getUsername());
        return toAjax(petHealthService.insertPetHealth(petHealth));
    }

    /**
     * 后台：修改档案
     */
    @PreAuthorize("@ss.hasPermi('pet:health:edit')")
    @Log(title = "健康档案", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetHealth petHealth)
    {
        petHealth.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(petHealthService.updatePetHealth(petHealth));
    }

    /**
     * 后台：删除档案
     */
    @PreAuthorize("@ss.hasPermi('pet:health:remove')")
    @Log(title = "健康档案", businessType = BusinessType.DELETE)
    @DeleteMapping("/{healthIds}")
    public AjaxResult remove(@PathVariable Long[] healthIds)
    {
        return toAjax(petHealthService.deletePetHealthByHealthIds(healthIds));
    }

    /**
     * 后台：导出
     */
    @PreAuthorize("@ss.hasPermi('pet:health:export')")
    @Log(title = "健康档案", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetHealth petHealth)
    {
        List<PetHealth> list = petHealthService.selectPetHealthList(petHealth);
        com.ruoyi.common.utils.poi.ExcelUtil<PetHealth> util = new com.ruoyi.common.utils.poi.ExcelUtil<PetHealth>(PetHealth.class);
        util.exportExcel(response, list, "健康档案数据");
    }
}
