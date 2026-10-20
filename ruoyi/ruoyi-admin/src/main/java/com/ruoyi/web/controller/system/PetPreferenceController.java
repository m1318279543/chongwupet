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
import com.ruoyi.system.domain.PetPreference;
import com.ruoyi.system.service.IPetPreferenceService;

/**
 * 宠物喜好 Controller
 *
 * 前台游客可按宠物ID查看喜好（/pet/preference/{petId}）；后台增删改需要 pet:preference:* 权限。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/preference")
public class PetPreferenceController extends BaseController
{
    @Autowired
    private IPetPreferenceService petPreferenceService;

    @PreAuthorize("@ss.hasPermi('pet:preference:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetPreference petPreference)
    {
        startPage();
        List<PetPreference> list = petPreferenceService.selectPetPreferenceList(petPreference);
        return getDataTable(list);
    }

    @GetMapping("/{petId}")
    public AjaxResult getByPetId(@PathVariable("petId") Long petId)
    {
        PetPreference pref = petPreferenceService.selectPetPreferenceByPetId(petId);
        if (pref == null)
        {
            return success(new PetPreference());
        }
        return success(pref);
    }

    @PreAuthorize("@ss.hasPermi('pet:preference:list')")
    @GetMapping("/detail/{preferenceId}")
    public AjaxResult getInfo(@PathVariable("preferenceId") Long preferenceId)
    {
        return success(petPreferenceService.selectPetPreferenceByPreferenceId(preferenceId));
    }

    @PreAuthorize("@ss.hasPermi('pet:preference:add')")
    @Log(title = "宠物喜好", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetPreference petPreference)
    {
        petPreference.setCreateBy(SecurityUtils.getUsername());
        return toAjax(petPreferenceService.insertPetPreference(petPreference));
    }

    @PreAuthorize("@ss.hasPermi('pet:preference:edit')")
    @Log(title = "宠物喜好", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetPreference petPreference)
    {
        petPreference.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(petPreferenceService.updatePetPreference(petPreference));
    }

    @PreAuthorize("@ss.hasPermi('pet:preference:remove')")
    @Log(title = "宠物喜好", businessType = BusinessType.DELETE)
    @DeleteMapping("/{preferenceIds}")
    public AjaxResult remove(@PathVariable Long[] preferenceIds)
    {
        return toAjax(petPreferenceService.deletePetPreferenceByPreferenceIds(preferenceIds));
    }
}
