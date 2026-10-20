package com.ruoyi.system.service;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetMatchRecord;

/**
 * AI 宠物智能匹配 Service
 *
 * @author ruoyi
 */
public interface IPetMatchService
{
    /** 根据问卷答案计算推荐结果 */
    public Map<String, Object> recommend(Map<String, Object> answers);

    /** 匹配记录列表 */
    public List<PetMatchRecord> selectRecordList(PetMatchRecord query);

    /** 按ID查询 */
    public PetMatchRecord selectRecordById(Long recordId);

    /** 批量删除 */
    public int deleteRecordByIds(Long[] recordIds);

    /** 清空 */
    public int cleanRecords();

    /** 累计匹配次数 */
    public int countRecords();
}
