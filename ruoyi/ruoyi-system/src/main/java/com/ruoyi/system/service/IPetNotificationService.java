package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetNotification;

/**
 * 站内消息通知 服务接口
 *
 * @author ruoyi
 */
public interface IPetNotificationService
{
    public PetNotification selectPetNotificationByNotifyId(Long notifyId);

    public List<PetNotification> selectPetNotificationList(PetNotification petNotification);

    public int countUnread(Long userId);

    public List<Map<String, Object>> countUnreadByType(Long userId);

    /**
     * 写入一条通知（业务事件 hook 统一走这里，内部静默容错，不影响主流程）
     */
    public void push(Long userId, String userName, String type, String title, String content, Long refId);

    public int markRead(Long notifyId);

    public int markAllRead(Long userId);
}
