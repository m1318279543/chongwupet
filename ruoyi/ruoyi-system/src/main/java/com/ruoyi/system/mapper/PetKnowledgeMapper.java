package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.ruoyi.system.domain.PetKnowledge;

/**
 * AI 知识库 Mapper
 *
 * @author ruoyi
 */
public interface PetKnowledgeMapper
{
    /** 全文检索（MySQL ngram），按相关度倒序 */
    public List<PetKnowledge> searchByFulltext(@Param("keyword") String keyword,
                                               @Param("species") String species,
                                               @Param("limit") int limit);

    /** 关键词兜底检索 */
    public List<PetKnowledge> searchByLike(@Param("keyword") String keyword,
                                           @Param("species") String species,
                                           @Param("limit") int limit);

    /** 后台列表 */
    public List<PetKnowledge> selectPetKnowledgeList(PetKnowledge query);

    public PetKnowledge selectPetKnowledgeById(Long knowledgeId);

    public int insertPetKnowledge(PetKnowledge knowledge);

    public int updatePetKnowledge(PetKnowledge knowledge);

    public int deletePetKnowledgeByIds(Long[] knowledgeIds);

    /** 命中计数 +1 */
    public int incrementHit(@Param("knowledgeId") Long knowledgeId);
}
