package com.ruoyi.web.controller.system;

import java.util.Date;
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
import com.ruoyi.system.domain.PetConsult;
import com.ruoyi.system.service.IPetConsultService;

/**
 * 客服咨询 Controller
 *
 * 用户（登录后）提交咨询并查看自己的咨询与回复；后台客服查看全部并回复（pet:consult:* 权限）。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/consult")
public class PetConsultController extends BaseController
{
    @Autowired
    private IPetConsultService petConsultService;

    /** 用户提交咨询（需登录，userId 取自当前 token） */
    @PostMapping("/submit")
    public AjaxResult submit(@RequestBody PetConsult petConsult)
    {
        Long userId = SecurityUtils.getUserId();
        if (userId == null)
        {
            return error("请先登录后再提交咨询");
        }
        if (org.springframework.util.StringUtils.isEmpty(petConsult.getQuestion()))
        {
            return error("咨询内容不能为空");
        }
        petConsult.setUserId(userId);
        petConsult.setUserName(SecurityUtils.getUsername());
        petConsult.setStatus("0");
        petConsult.setCreateBy(SecurityUtils.getUsername());
        return toAjax(petConsultService.insertPetConsult(petConsult));
    }

    /** 用户查看自己的咨询（需登录） */
    @GetMapping("/my")
    public TableDataInfo my()
    {
        Long userId = SecurityUtils.getUserId();
        if (userId == null)
        {
            return getDataTable(java.util.Collections.emptyList());
        }
        startPage();
        PetConsult query = new PetConsult();
        query.setUserId(userId);
        List<PetConsult> list = petConsultService.selectPetConsultList(query);
        return getDataTable(list);
    }

    /** 后台：咨询列表 */
    @PreAuthorize("@ss.hasPermi('pet:consult:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetConsult petConsult)
    {
        startPage();
        List<PetConsult> list = petConsultService.selectPetConsultList(petConsult);
        return getDataTable(list);
    }

    @PreAuthorize("@ss.hasPermi('pet:consult:list')")
    @GetMapping("/{consultId}")
    public AjaxResult getInfo(@PathVariable("consultId") Long consultId)
    {
        return success(petConsultService.selectPetConsultByConsultId(consultId));
    }

    /** 后台：客服回复 */
    @PreAuthorize("@ss.hasPermi('pet:consult:edit')")
    @Log(title = "客服咨询", businessType = BusinessType.UPDATE)
    @PutMapping("/reply")
    public AjaxResult reply(@RequestBody PetConsult petConsult)
    {
        if (org.springframework.util.StringUtils.isEmpty(petConsult.getReply()))
        {
            return error("回复内容不能为空");
        }
        petConsult.setReplyBy(SecurityUtils.getUsername());
        petConsult.setReplyTime(new Date());
        petConsult.setStatus("1");
        petConsult.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(petConsultService.updatePetConsult(petConsult));
    }

    @PreAuthorize("@ss.hasPermi('pet:consult:remove')")
    @Log(title = "客服咨询", businessType = BusinessType.DELETE)
    @DeleteMapping("/{consultIds}")
    public AjaxResult remove(@PathVariable Long[] consultIds)
    {
        return toAjax(petConsultService.deletePetConsultByConsultIds(consultIds));
    }
}
