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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.poi.ExcelUtil;
import com.ruoyi.system.domain.PetFavorite;
import com.ruoyi.system.service.IPetFavoriteService;

/**
 * 收藏管理 Controller
 *
 * 权限说明：前台登录用户可对自己收藏的数据进行新增/查询/删除；
 * 导出等管理类操作仍需要后台权限标识。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/favorite")
public class PetFavoriteController extends BaseController
{
    @Autowired
    private IPetFavoriteService petFavoriteService;

    /**
     * 查询收藏列表：管理员看全部，普通用户只看自己的
     */
    @GetMapping("/list")
    public TableDataInfo list(PetFavorite petFavorite)
    {
        if (!SecurityUtils.isAdmin())
        {
            petFavorite.setUserId(SecurityUtils.getUserId());
        }
        startPage();
        List<PetFavorite> list = petFavoriteService.selectPetFavoriteList(petFavorite);
        return getDataTable(list);
    }

    @PreAuthorize("@ss.hasPermi('pet:favorite:export')")
    @Log(title = "收藏管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetFavorite petFavorite)
    {
        List<PetFavorite> list = petFavoriteService.selectPetFavoriteList(petFavorite);
        ExcelUtil<PetFavorite> util = new ExcelUtil<PetFavorite>(PetFavorite.class);
        util.exportExcel(response, list, "收藏管理数据");
    }

    /**
     * 我的收藏 petId 集合：前台列表页打红心用，只回一列。
     * 替代前端 pageSize=1000 拉整行收藏记录。
     */
    @GetMapping("/mine/ids")
    public AjaxResult myFavoriteIds()
    {
        return success(petFavoriteService.selectPetIdsByUserId(SecurityUtils.getUserId()));
    }

    /**
     * 收藏详情：普通用户只能查看属于自己的记录
     */
    @GetMapping(value = "/{favoriteId}")
    public AjaxResult getInfo(@PathVariable("favoriteId") Long favoriteId)
    {
        PetFavorite favorite = petFavoriteService.selectPetFavoriteByFavoriteId(favoriteId);
        if (favorite == null)
        {
            return error("收藏记录不存在");
        }
        if (!SecurityUtils.isAdmin() && (favorite.getUserId() == null || !favorite.getUserId().equals(SecurityUtils.getUserId())))
        {
            return error("没有权限查看该收藏记录");
        }
        return success(favorite);
    }

    /**
     * 新增收藏：登录即可，普通用户自动归属当前账号
     */
    @Log(title = "收藏管理", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@Validated @RequestBody PetFavorite petFavorite)
    {
        if (!SecurityUtils.isAdmin() || petFavorite.getUserId() == null)
        {
            petFavorite.setUserId(SecurityUtils.getUserId());
        }
        return toAjax(petFavoriteService.insertPetFavorite(petFavorite));
    }

    /**
     * 删除收藏：普通用户只能删除自己的
     */
    @Log(title = "收藏管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{favoriteIds}")
    public AjaxResult remove(@PathVariable Long[] favoriteIds)
    {
        if (!SecurityUtils.isAdmin())
        {
            Long currentUserId = SecurityUtils.getUserId();
            for (Long favoriteId : favoriteIds)
            {
                PetFavorite favorite = petFavoriteService.selectPetFavoriteByFavoriteId(favoriteId);
                if (favorite == null || favorite.getUserId() == null || !favorite.getUserId().equals(currentUserId))
                {
                    return error("只能取消自己的收藏");
                }
            }
        }
        return toAjax(petFavoriteService.deletePetFavoriteByFavoriteIds(favoriteIds));
    }
}
