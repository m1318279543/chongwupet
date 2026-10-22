package com.ruoyi.system.service;

/**
 * 门店数据范围 服务层
 *
 * 约定：
 *   - 管理员（user_id=1）返回 null，表示不限制门店；
 *   - 已绑定门店的员工返回其 store_id；
 *   - 其他非管理员返回 -1，表示没有任何门店数据权限。
 *
 * @author ruoyi
 */
public interface IPetScopeService
{
    /** 当前登录人可见的门店ID：null=全部，-1=无权限 */
    public Long currentStoreId();

    /** 校验当前登录人是否有权访问指定门店，无权限直接抛业务异常 */
    public void assertStoreAccessible(Long storeId);
}
