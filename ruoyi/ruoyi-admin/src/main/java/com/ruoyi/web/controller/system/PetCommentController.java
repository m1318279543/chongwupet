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
import com.ruoyi.system.domain.PetComment;
import com.ruoyi.system.service.IPetCommentService;

/**
 * 宠物评论 Controller
 *
 * 权限说明：前台登录用户可发表评论、查看评论、删除自己的评论；
 * 后台管理（改状态/删除任意/导出）需要权限标识 pet:comment:list / pet:comment:edit / pet:comment:remove / pet:comment:export。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/comment")
public class PetCommentController extends BaseController
{
    @Autowired
    private IPetCommentService petCommentService;

    /**
     * 评论列表（前台详情页按 petId 查询；管理员可见隐藏评论，普通用户只看正常评论）
     */
    @GetMapping("/list")
    public TableDataInfo list(PetComment petComment)
    {
        // 游客可读：只展示正常状态评论；管理员可见隐藏评论
        if (!isAdmin())
        {
            petComment.setStatus("0");
        }
        // 默认按宠物维度查询；宠物粮前端传 targetType=food
        if (petComment.getTargetType() == null || petComment.getTargetType().isEmpty())
        {
            petComment.setTargetType("pet");
        }
        startPage();
        List<PetComment> list = petCommentService.selectPetCommentList(petComment);
        return getDataTable(list);
    }

    /**
     * 发表评论（登录即可；parentId 非空时为回复）
     */
    @PostMapping
    public AjaxResult add(@RequestBody PetComment petComment)
    {
        petComment.setUserId(SecurityUtils.getUserId());
        petComment.setCreateBy(SecurityUtils.getUsername());
        petComment.setStatus("0");
        if (petComment.getParentId() == null)
        {
            petComment.setParentId(0L);
        }
        return toAjax(petCommentService.insertPetComment(petComment));
    }

    /**
     * 删除评论：自己的可以删，管理员可以删任意
     */
    @DeleteMapping("/{commentId}")
    public AjaxResult remove(@PathVariable("commentId") Long commentId)
    {
        PetComment comment = petCommentService.selectPetCommentByCommentId(commentId);
        if (comment == null)
        {
            return error("评论不存在或已删除");
        }
        if (!SecurityUtils.isAdmin() && !SecurityUtils.getUserId().equals(comment.getUserId()))
        {
            return error("只能删除自己的评论");
        }
        return toAjax(petCommentService.deletePetCommentByCommentIds(new Long[] { commentId }));
    }

    /**
     * 后台修改评论（显示/隐藏）
     */
    @PreAuthorize("@ss.hasPermi('pet:comment:edit')")
    @Log(title = "评论管理", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetComment petComment)
    {
        return toAjax(petCommentService.updatePetComment(petComment));
    }

    /**
     * 后台批量删除评论
     */
    @PreAuthorize("@ss.hasPermi('pet:comment:remove')")
    @Log(title = "评论管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/batch/{commentIds}")
    public AjaxResult removeBatch(@PathVariable Long[] commentIds)
    {
        return toAjax(petCommentService.deletePetCommentByCommentIds(commentIds));
    }

    /**
     * 后台评论管理列表（含隐藏）
     */
    @PreAuthorize("@ss.hasPermi('pet:comment:manage')")
    @GetMapping("/manage/list")
    public TableDataInfo manageList(PetComment petComment)
    {
        startPage();
        List<PetComment> list = petCommentService.selectPetCommentList(petComment);
        return getDataTable(list);
    }

    /** 安全判断管理员：游客返回 false，不抛 401 */
    private boolean isAdmin()
    {
        try
        {
            return SecurityUtils.isAdmin();
        }
        catch (Exception e)
        {
            return false;
        }
    }

    @PreAuthorize("@ss.hasPermi('pet:comment:export')")
    @Log(title = "评论管理", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, PetComment petComment)
    {
        List<PetComment> list = petCommentService.selectPetCommentList(petComment);
        com.ruoyi.common.utils.poi.ExcelUtil<PetComment> util = new com.ruoyi.common.utils.poi.ExcelUtil<PetComment>(PetComment.class);
        util.exportExcel(response, list, "评论数据");
    }
}
