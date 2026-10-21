package com.ruoyi.web.controller.system;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetNotification;
import com.ruoyi.system.service.IPetNotificationService;

/**
 * 站内消息通知 Controller
 *
 *   GET  /pet/notification/list       我的通知（分页）
 *   GET  /pet/notification/unread     未读数（含按类型分组）
 *   POST /pet/notification/read/{id}  标记单条已读
 *   POST /pet/notification/readAll    全部已读
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/notification")
public class PetNotificationController extends BaseController
{
    @Autowired
    private IPetNotificationService petNotificationService;

    /** 我的通知列表：管理员可带 userId 查任意用户，普通用户强制只看自己 */
    @GetMapping("/list")
    public TableDataInfo list(PetNotification petNotification)
    {
        if (!SecurityUtils.isAdmin())
        {
            petNotification.setUserId(SecurityUtils.getUserId());
        }
        startPage();
        List<PetNotification> list = petNotificationService.selectPetNotificationList(petNotification);
        return getDataTable(list);
    }

    /** 未读数（铃铛角标轮询） */
    @GetMapping("/unread")
    public AjaxResult unread()
    {
        Long userId = SecurityUtils.getUserId();
        Map<String, Object> m = new HashMap<>();
        m.put("total", petNotificationService.countUnread(userId));
        m.put("byType", petNotificationService.countUnreadByType(userId));
        return success(m);
    }

    /** 标记单条已读（自己的通知） */
    @PostMapping("/read/{notifyId}")
    public AjaxResult read(@PathVariable Long notifyId)
    {
        PetNotification n = petNotificationService.selectPetNotificationByNotifyId(notifyId);
        if (n == null)
        {
            return error("通知不存在");
        }
        if (!SecurityUtils.isAdmin() && !SecurityUtils.getUserId().equals(n.getUserId()))
        {
            return error("只能操作自己的通知");
        }
        return toAjax(petNotificationService.markRead(notifyId));
    }

    /** 全部已读 */
    @PostMapping("/readAll")
    public AjaxResult readAll()
    {
        return toAjax(petNotificationService.markAllRead(SecurityUtils.getUserId()));
    }
}
