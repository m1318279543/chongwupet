package com.ruoyi.system.mapper;

import java.util.List;
import java.util.Map;
import com.ruoyi.system.domain.PetMatchRecord;

/**
 * AI 宠物匹配 Mapper
 *
 * @author ruoyi
 */
public interface PetMatchMapper
{
    /** 宠物 + 匹配特征（仅在售宠物） */
    public List<Map<String, Object>> selectTraitPets();

    /** 用户历史行为信号：user_id / pet_id / weight（收藏、预约、点赞） */
    public List<Map<String, Object>> selectInteractionSignals();

    /** 新增匹配记录 */
    public int insertPetMatchRecord(PetMatchRecord record);

    /** 查询匹配记录列表 */
    public List<PetMatchRecord> selectPetMatchRecordList(PetMatchRecord query);

    /** 按ID查询 */
    public PetMatchRecord selectPetMatchRecordById(Long recordId);

    /** 批量删除 */
    public int deletePetMatchRecordByIds(Long[] recordIds);

    /** 清空 */
    public int deletePetMatchRecordAll();

    /** 总记录数（用于统计） */
    public int countPetMatchRecord();

    /** 匹配统计：总数 / 无匹配数 / 今日次数 */
    public Map<String, Object> selectMatchStat();
}
