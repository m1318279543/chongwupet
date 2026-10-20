package com.ruoyi.framework.config;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 明文兼容的密码加密器（课程演示用）
 *
 * 说明：
 * 1. encode() 直接返回明文，方便在数据库 sys_user.password 中直观查看密码；
 * 2. matches() 同时兼容 BCrypt 密文（$2a$/$2b$/$2y$ 开头）与明文，
 *    因此把历史密文改成明文后仍然可以正常登录；
 * 3. 继承 BCryptPasswordEncoder，保证其它通过 getBean(BCryptPasswordEncoder.class)
 *    获取加密器的代码（注册、重置密码等）不受影响。
 *
 * @author ruoyi
 */
public class PlainPasswordEncoder extends BCryptPasswordEncoder
{
    /**
     * 明文存储
     */
    @Override
    public String encode(CharSequence rawPassword)
    {
        return rawPassword == null ? null : rawPassword.toString();
    }

    /**
     * 兼容校验：BCrypt 密文走原逻辑，其余按明文比对
     */
    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword)
    {
        if (rawPassword == null || encodedPassword == null)
        {
            return false;
        }
        if (encodedPassword.startsWith("$2a$") || encodedPassword.startsWith("$2b$") || encodedPassword.startsWith("$2y$"))
        {
            return super.matches(rawPassword, encodedPassword);
        }
        return rawPassword.toString().equals(encodedPassword);
    }
}
