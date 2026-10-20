package com.ruoyi.web.controller.system;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.system.service.IPetDashboardService;

/**
 * 数据看板 Controller
 *
 * 所有指标实时聚合自业务表，支持按 7 / 30 / 90 天（任意 1-365 天）查询历史数据。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/dashboard")
public class PetDashboardController extends BaseController
{
    @Autowired
    private IPetDashboardService dashboardService;

    /**
     * 看板全量数据：汇总指标 + 按天趋势 + 状态分布 + 排行榜 + 时段分布
     *
     * @param days 统计天数（含今天），默认 30
     */
    @GetMapping("/all")
    public AjaxResult all(@RequestParam(value = "days", defaultValue = "30") Integer days)
    {
        return success(dashboardService.all(days == null ? 30 : days));
    }

    /**
     * 实时数据：今日指标 + 最新业务动态（供前端轮询）
     */
    @GetMapping("/realtime")
    public AjaxResult realtime()
    {
        return success(dashboardService.realtime());
    }
}
