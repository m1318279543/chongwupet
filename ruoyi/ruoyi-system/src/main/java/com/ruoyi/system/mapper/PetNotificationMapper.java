package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetNotification;

/**
 * 站内消息通知 Mapper 接口
 *
 * @author ruoyi
 */
public interface PetNotificationMapper
{
    public PetNotification selectPetNotificationByNotifyId(Long notifyId);

    public List<PetNotification> selectPetNotificationList(PetNotification petNotification);

    /** 用户未读数 */
    public int countUnread(Long userId);

    /** 按类型统计未读（铃铛角标分组用） */
    public List<Map<String, Object>> countUnreadByType(Long userId);

    public int insertPetNotification(PetNotification petNotification);

    public int markRead(Long notifyId);

    public int markAllRead(Long userId);
}
