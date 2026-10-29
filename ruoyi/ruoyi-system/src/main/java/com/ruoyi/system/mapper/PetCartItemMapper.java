package com.ruoyi.system.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import com.ruoyi.system.domain.PetCartItem;

/**
 * 前台购物车 Mapper（注解版，表小查询简单，不再单独写 XML）
 *
 * @author ruoyi
 */
public interface PetCartItemMapper
{
    @Select("select cart_item_id as cartItemId, user_id as userId, item_type as itemType, pet_id as petId, "
            + "goods_id as goodsId, sku_id as skuId, goods_name as goodsName, goods_image as goodsImage, "
            + "goods_spec as goodsSpec, price, qty, checked, create_time as createTime, update_time as updateTime "
            + "from pet_cart_item where user_id = #{userId} order by cart_item_id")
    List<PetCartItem> selectByUser(@Param("userId") Long userId);

    @Insert("insert into pet_cart_item (user_id, item_type, pet_id, goods_id, sku_id, goods_name, goods_image, "
            + "goods_spec, price, qty, checked) values (#{userId}, #{itemType}, #{petId}, #{goodsId}, #{skuId}, "
            + "#{goodsName}, #{goodsImage}, #{goodsSpec}, #{price}, #{qty}, #{checked})")
    @Options(useGeneratedKeys = true, keyProperty = "cartItemId")
    int insertPetCartItem(PetCartItem item);

    @Update("update pet_cart_item set item_type = #{itemType}, pet_id = #{petId}, goods_id = #{goodsId}, "
            + "sku_id = #{skuId}, goods_name = #{goodsName}, goods_image = #{goodsImage}, goods_spec = #{goodsSpec}, "
            + "price = #{price}, qty = #{qty}, checked = #{checked} where cart_item_id = #{cartItemId}")
    int updatePetCartItem(PetCartItem item);

    @Update("update pet_cart_item set qty = #{qty} where cart_item_id = #{cartItemId} and user_id = #{userId}")
    int updateQty(@Param("userId") Long userId, @Param("cartItemId") Long cartItemId, @Param("qty") Integer qty);

    @Update("update pet_cart_item set checked = #{checked} where cart_item_id = #{cartItemId} and user_id = #{userId}")
    int updateChecked(@Param("userId") Long userId, @Param("cartItemId") Long cartItemId, @Param("checked") String checked);

    @Update("update pet_cart_item set checked = #{checked} where user_id = #{userId}")
    int updateCheckedAll(@Param("userId") Long userId, @Param("checked") String checked);

    @Delete("<script>delete from pet_cart_item where user_id = #{userId} and cart_item_id in "
            + "<foreach collection='ids' item='id' open='(' separator=',' close=')'>#{id}</foreach></script>")
    int deleteByIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    @Delete("delete from pet_cart_item where user_id = #{userId}")
    int deleteByUser(@Param("userId") Long userId);
}
