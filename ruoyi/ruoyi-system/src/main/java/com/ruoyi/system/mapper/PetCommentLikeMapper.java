package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import com.ruoyi.system.domain.PetComment;

/**
 * 评论点赞记录 Mapper（注解版）
 * 一人一评一赞（uk_comment_user），pet_comment.like_count 做冗余计数
 *
 * @author ruoyi
 */
public interface PetCommentLikeMapper
{
    @Select("select count(1) from pet_comment_like where comment_id = #{commentId} and user_id = #{userId}")
    int existsByUserAndComment(@Param("userId") Long userId, @Param("commentId") Long commentId);

    @Insert("insert into pet_comment_like (comment_id, user_id) values (#{commentId}, #{userId})")
    int insert(@Param("userId") Long userId, @Param("commentId") Long commentId);

    @Delete("delete from pet_comment_like where comment_id = #{commentId} and user_id = #{userId}")
    int deleteByUserAndComment(@Param("userId") Long userId, @Param("commentId") Long commentId);

    /** 当前用户在某个目标（宠物/宠物粮）下点过赞的评论ID集合 */
    @Select("select l.comment_id from pet_comment_like l join pet_comment c on c.comment_id = l.comment_id "
            + "where l.user_id = #{userId} and c.pet_id = #{petId} and c.target_type = #{targetType} and c.del_flag = '0'")
    List<Long> selectLikedCommentIds(@Param("userId") Long userId, @Param("petId") Long petId, @Param("targetType") String targetType);

    @Update("update pet_comment set like_count = like_count + 1 where comment_id = #{commentId}")
    int incrementLikeCount(@Param("commentId") Long commentId);

    @Update("update pet_comment set like_count = greatest(like_count - 1, 0) where comment_id = #{commentId}")
    int decrementLikeCount(@Param("commentId") Long commentId);
}
