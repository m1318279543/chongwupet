package com.ruoyi.system.service.impl;

import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.ruoyi.common.exception.ServiceException;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetNotification;
import com.ruoyi.system.mapper.PetNotificationMapper;
import com.ruoyi.system.service.IPetNotificationService;

/**
 * 站内消息通知 服务实现
 *
 * @author ruoyi
 */
@Service
public class PetNotificationServiceImpl implements IPetNotificationService
{
    private static final Logger log = LoggerFactory.getLogger(PetNotificationServiceImpl.class);

    @Autowired
    private PetNotificationMapper petNotificationMapper;

    @Override
    public PetNotification selectPetNotificationByNotifyId(Long notifyId)
    {
        return petNotificationMapper.selectPetNotificationByNotifyId(notifyId);
    }

    @Override
    public List<PetNotification> selectPetNotificationList(PetNotification petNotification)
    {
        return petNotificationMapper.selectPetNotificationList(petNotification);
    }

    @Override
    public int countUnread(Long userId)
    {
        if (userId == null)
        {
            return 0;
        }
        return petNotificationMapper.countUnread(userId);
    }

    @Override
    public List<Map<String, Object>> countUnreadByType(Long userId)
    {
        return petNotificationMapper.countUnreadByType(userId);
    }

    @Override
    public void push(Long userId, String userName, String type, String title, String content, Long refId)
    {
        // 通知是锦上添花，任何异常都不能影响主业务流程
        try
        {
            if (userId == null)
            {
                return;
            }
            PetNotification n = new PetNotification();
            n.setUserId(userId);
            n.setUserName(userName);
            n.setType(StringUtils.isBlank(type) ? "system" : type);
            n.setTitle(StringUtils.isBlank(title) ? "系统通知" : title);
            n.setContent(content == null ? "" : content);
            n.setRefId(refId);
            n.setIsRead("0");
            petNotificationMapper.insertPetNotification(n);
        }
        catch (Exception e)
        {
            log.warn("写入站内通知失败（忽略）：{}", e.getMessage());
        }
    }

    @Override
    public int markRead(Long notifyId)
    {
        return petNotificationMapper.markRead(notifyId);
    }

    @Override
    public int markAllRead(Long userId)
    {
        return petNotificationMapper.markAllRead(userId);
    }
}
