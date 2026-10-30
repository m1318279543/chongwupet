package com.ruoyi.common.utils;

import java.util.regex.Pattern;
import com.ruoyi.common.exception.ServiceException;

/**
 * 手机号校验工具
 *
 * 业务上只认大陆 11 位手机号：1 开头，第二位 3-9，共 11 位数字。
 * 输入允许带空格、连字符、括号或 +86 前缀，入库前统一规范化成纯数字，
 * 避免「139 0000 0000」「+8613900000000」这类脏数据进入数据库。
 *
 * @author ruoyi
 */
public class PhoneUtils
{
    /** 大陆手机号严格规则 */
    private static final Pattern MOBILE = Pattern.compile("^1[3-9]\\d{9}$");

    private PhoneUtils()
    {
    }

    /**
     * 规范化：去掉分隔符与国际区号，只保留数字；无有效数字时返回 null
     */
    public static String normalize(String raw)
    {
        if (raw == null)
        {
            return null;
        }
        String s = raw.replaceAll("[\\s\\-()（）－—]", "");
        if (s.startsWith("+86"))
        {
            s = s.substring(3);
        }
        else if (s.startsWith("0086"))
        {
            s = s.substring(4);
        }
        else if (s.startsWith("86") && s.length() == 13)
        {
            s = s.substring(2);
        }
        s = s.replaceAll("[^0-9]", "");
        return s.isEmpty() ? null : s;
    }

    /**
     * 是否为合法手机号
     */
    public static boolean isMobile(String raw)
    {
        String s = normalize(raw);
        return s != null && MOBILE.matcher(s).matches();
    }

    /**
     * 严格校验并返回规范化后的手机号，不合格直接抛业务异常
     *
     * @param raw        原始输入
     * @param fieldLabel 字段名，用于错误提示（如「联系电话」）
     */
    public static String require(String raw, String fieldLabel)
    {
        String s = normalize(raw);
        if (s == null)
        {
            throw new ServiceException("请填写" + fieldLabel);
        }
        if (!MOBILE.matcher(s).matches())
        {
            throw new ServiceException(fieldLabel + "格式不正确：请填写 11 位手机号（1 开头，第二位为 3-9）");
        }
        return s;
    }

    /**
     * 非必填场景：为空返回 null，填了就必须合法
     */
    public static String optional(String raw, String fieldLabel)
    {
        String s = normalize(raw);
        if (s == null)
        {
            return null;
        }
        if (!MOBILE.matcher(s).matches())
        {
            throw new ServiceException(fieldLabel + "格式不正确：请填写 11 位手机号（1 开头，第二位为 3-9）");
        }
        return s;
    }
}
