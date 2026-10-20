package com.ruoyi.web.controller.system;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetLike;
import com.ruoyi.system.service.IPetLikeService;

/**
 * 宠物点赞 Controller
 *
 * 权限说明：前台登录用户可点赞/取消点赞/查询自己是否已赞；
 * 点赞记录管理（列表/删除/导出）需要后台权限标识 pet:like:list / pet:like:remove / pet:like:export。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/like")
public class PetLikeController extends BaseController
{
    @Autowired
    private IPetLikeService petLikeService;

    /**
     * 查询点赞记录：后台管理用，需要权限
     */
    @PreAuthorize("@ss.hasPermi('pet:like:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetLike petLike)
    {
        startPage();
        List<PetLike> list = petLikeService.selectPetLikeList(petLike);
        return getDataTable(list);
    }

    /**
     * 查询当前用户对某目标（宠物/宠物粮）的点赞状态 + 总赞数（前台详情页用）
     */
    @GetMapping("/status/{petId}")
    public AjaxResult status(@PathVariable("petId") Long petId,
                            @RequestParam(value = "targetType", required = false) String targetType)
    {
        // 游客可读：未登录时 liked 恒为 false，仍返回真实点赞总数
        Long userId = currentUserId();
        String type = "food".equals(targetType) ? "food" : "pet";
        Map<String, Object> data = new HashMap<>();
        data.put("liked", userId != null && petLikeService.isLiked(userId, petId, type));
        data.put("count", petLikeService.countByPetId(petId, type));
        data.put("login", userId != null);
        return success(data);
    }

    /** 安全获取当前用户ID：游客返回 null，不抛 401 */
    private Long currentUserId()
    {
        try
        {
            return SecurityUtils.getUserId();
        }
        catch (Exception e)
        {
            return null;
        }
    }

    /**
     * 点赞（幂等）
     */
    @PostMapping("/{petId}")
    public AjaxResult like(@PathVariable("petId") Long petId,
                           @RequestParam(value = "targetType", required = false) String targetType)
    {
        String type = "food".equals(targetType) ? "food" : "pet";
        int count = petLikeService.like(SecurityUtils.getUserId(), petId, type);
        AjaxResult ajax = success("点赞成功");
        ajax.put("count", count);
        ajax.put("liked", true);
        return ajax;
    }

    /**
     * 取消点赞（幂等）
     */
    @DeleteMapping("/{petId}")
    public AjaxResult unlike(@PathVariable("petId") Long petId,
                             @RequestParam(value = "targetType", required = false) String targetType)
    {
        String type = "food".equals(targetType) ? "food" : "pet";
        int count = petLikeService.unlike(SecurityUtils.getUserId(), petId, type);
        AjaxResult ajax = success("已取消点赞");
        ajax.put("count", count);
        ajax.put("liked", false);
        return ajax;
    }

    @PreAuthorize("@ss.hasPermi('pet:like:remove')")
    @Log(title = "点赞管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/record/{likeIds}")
    public AjaxResult remove(@PathVariable Long[] likeIds)
    {
        return toAjax(petLikeService.deletePetLikeByLikeIds(likeIds));
    }

    @PreAuthorize("@ss.hasPermi('pet:like:export')")
    @Log(title = "点赞管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetLike petLike)
    {
        List<PetLike> list = petLikeService.selectPetLikeList(petLike);
        com.ruoyi.common.utils.poi.ExcelUtil<PetLike> util = new com.ruoyi.common.utils.poi.ExcelUtil<PetLike>(PetLike.class);
        util.exportExcel(response, list, "点赞数据");
    }
}
