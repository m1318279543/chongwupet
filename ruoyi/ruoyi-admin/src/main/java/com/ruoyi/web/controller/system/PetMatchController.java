package com.ruoyi.web.controller.system;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.system.domain.PetMatchRecord;
import com.ruoyi.system.service.IPetMatchService;

/**
 * AI 宠物智能匹配 Controller
 *
 * 问卷推荐接口开放匿名访问；记录管理需要 pet:match:* 权限。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/match")
public class PetMatchController extends BaseController
{
    @Autowired
    private IPetMatchService matchService;

    /**
     * 提交问卷，获取智能匹配结果（匿名可用，登录后用协同过滤增强）
     */
    @PostMapping("/recommend")
    public AjaxResult recommend(@RequestBody Map<String, Object> answers)
    {
        return success(matchService.recommend(answers));
    }

    /** 匹配记录列表 */
    @PreAuthorize("@ss.hasPermi('pet:match:list')")
    @GetMapping("/records")
    public TableDataInfo records(PetMatchRecord query)
    {
        startPage();
        return getDataTable(matchService.selectRecordList(query));
    }

    /** 记录详情 */
    @PreAuthorize("@ss.hasPermi('pet:match:list')")
    @GetMapping("/records/{recordId}")
    public AjaxResult detail(@PathVariable Long recordId)
    {
        return success(matchService.selectRecordById(recordId));
    }

    /** 累计匹配次数 / 无匹配次数 / 今日次数 */
    @PreAuthorize("@ss.hasPermi('pet:match:list')")
    @GetMapping("/stat")
    public AjaxResult stat()
    {
        return success(matchService.stat());
    }

    /** 批量删除 */
    @PreAuthorize("@ss.hasPermi('pet:match:remove')")
    @Log(title = "智能匹配记录", businessType = BusinessType.DELETE)
    @DeleteMapping("/records/{ids}")
    public AjaxResult remove(@PathVariable Long[] ids)
    {
        return toAjax(matchService.deleteRecordByIds(ids));
    }

    /** 清空 */
    @PreAuthorize("@ss.hasPermi('pet:match:remove')")
    @Log(title = "智能匹配记录", businessType = BusinessType.CLEAN)
    @DeleteMapping("/clean")
    public AjaxResult clean()
    {
        return toAjax(matchService.cleanRecords());
    }
}
