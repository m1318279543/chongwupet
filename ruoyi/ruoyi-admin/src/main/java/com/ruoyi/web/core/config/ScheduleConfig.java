package com.ruoyi.web.core.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * 开启 Spring @Scheduled 定时任务（订单超时自动取消等）
 *
 * @author ruoyi
 */
@Configuration
@EnableScheduling
public class ScheduleConfig
{
}
