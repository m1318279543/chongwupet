package com.ruoyi.web.controller.system;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.service.IPetInfoService;
import com.ruoyi.system.service.IPetScopeService;

/**
 * 宠物信息 Controller
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/info")
public class PetInfoController extends BaseController
{
    @Autowired
    private IPetInfoService petInfoService;

    @Autowired
    private IPetScopeService petScopeService;

    @GetMapping("/list")
    public TableDataInfo list(PetInfo petInfo)
    {
        // 该接口对游客开放：只有已登录的门店员工才按门店收敛；
        // 普通顾客账号 currentStoreId() 返回 -1（无员工归属），不能当作筛选条件，否则前台会查成 0 只
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof LoginUser)
        {
            Long scope = petScopeService.currentStoreId();
            if (scope != null && scope > 0)
            {
                petInfo.setStoreId(scope);
            }
        }
        startPage();
        List<PetInfo> list = petInfoService.selectPetInfoList(petInfo);
        return getDataTable(list);
    }

    /**
     * 首页与列表页的聚合数据：总数、在售数、分类数、各分类计数、精选 N 只。
     * 对游客开放；用一条请求替代前端 pageSize=1000 的全量拉取。
     */
    @GetMapping("/overview")
    public AjaxResult overview(@RequestParam(value = "limit", defaultValue = "12") int limit)
    {
        AjaxResult ajax = AjaxResult.success();
        ajax.put("counts", petInfoService.selectPetInfoCounts());
        ajax.put("byCategory", petInfoService.selectPetCountByCategory());
        ajax.put("featured", petInfoService.selectFeaturedPets(limit));
        return ajax;
    }

    @PreAuthorize("@ss.hasPermi('pet:info:export')")
    @Log(title = "宠物信息", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetInfo petInfo)
    {
        List<PetInfo> list = petInfoService.selectPetInfoList(petInfo);
        ExcelUtil<PetInfo> util = new ExcelUtil<PetInfo>(PetInfo.class);
        util.exportExcel(response, list, "宠物信息数据");
    }

    @GetMapping(value = "/{petId}")
    public AjaxResult getInfo(@PathVariable("petId") Long petId)
    {
        return success(petInfoService.selectPetInfoByPetId(petId));
    }

    @PreAuthorize("@ss.hasPermi('pet:info:add')")
    @Log(title = "宠物信息", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetInfo petInfo)
    {
        return toAjax(petInfoService.insertPetInfo(petInfo));
    }
    /**
     * 修改宠物信息
     */
    @PreAuthorize("@ss.hasPermi('pet:info:edit')")
    @Log(title = "宠物信息", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@Validated @RequestBody PetInfo petInfo)
    {
        return toAjax(petInfoService.updatePetInfo(petInfo));
    }

    @PreAuthorize("@ss.hasPermi('pet:info:remove')")
    @Log(title = "宠物信息", businessType = BusinessType.DELETE)
    @DeleteMapping("/{petIds}")
    public AjaxResult remove(@PathVariable Long[] petIds)
    {
        return toAjax(petInfoService.deletePetInfoByPetIds(petIds));
    }
}
