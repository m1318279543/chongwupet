package com.ruoyi.web.controller.system;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.annotation.Log;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.page.TableDataInfo;
import com.ruoyi.common.enums.BusinessType;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetStockLog;
import com.ruoyi.system.service.IPetGoodsService;

/**
 * 商品与库存 Controller
 *
 * 前台取商品用 /pet/goods/list 与 /pet/goods/shop/{id}（免登录），
 * 后台维护与库存调整需要对应权限位。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/goods")
public class PetGoodsController extends BaseController
{
    @Autowired
    private IPetGoodsService petGoodsService;

    /** 商品列表：前台（游客）与后台共用，前台固定传 status=0 */
    @GetMapping("/list")
    public TableDataInfo list(PetGoods goods)
    {
        startPage();
        List<PetGoods> list = petGoodsService.selectPetGoodsList(goods);
        return getDataTable(list);
    }

    /** 前台商品详情（免登录） */
    @GetMapping("/shop/{goodsId}")
    public AjaxResult shopDetail(@PathVariable("goodsId") Long goodsId)
    {
        PetGoods goods = petGoodsService.selectPetGoodsById(goodsId);
        if (goods == null || "2".equals(goods.getDelFlag()) || "1".equals(goods.getStatus()))
        {
            return error("商品已下架");
        }
        return success(goods);
    }

    /** 后台商品详情 */
    @PreAuthorize("@ss.hasPermi('pet:goods:list')")
    @GetMapping("/{goodsId}")
    public AjaxResult getInfo(@PathVariable("goodsId") Long goodsId)
    {
        return success(petGoodsService.selectPetGoodsById(goodsId));
    }

    /** 新增商品（自动建默认 SKU） */
    @PreAuthorize("@ss.hasPermi('pet:goods:edit')")
    @Log(title = "商品管理", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetGoods goods)
    {
        goods.setCreateBy(getUsername());
        return toAjax(petGoodsService.insertPetGoods(goods));
    }

    /** 修改商品 */
    @PreAuthorize("@ss.hasPermi('pet:goods:edit')")
    @Log(title = "商品管理", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetGoods goods)
    {
        goods.setUpdateBy(getUsername());
        return toAjax(petGoodsService.updatePetGoods(goods));
    }

    /** 删除商品（逻辑删除，同时下架） */
    @PreAuthorize("@ss.hasPermi('pet:goods:edit')")
    @Log(title = "商品管理", businessType = BusinessType.DELETE)
    @DeleteMapping("/{goodsIds}")
    public AjaxResult remove(@PathVariable Long[] goodsIds)
    {
        return toAjax(petGoodsService.deletePetGoodsByIds(goodsIds));
    }

    /** 库存流水 */
    @PreAuthorize("@ss.hasPermi('pet:stock:list')")
    @GetMapping("/stock/logs")
    public TableDataInfo stockLogs(PetStockLog query)
    {
        startPage();
        return getDataTable(petGoodsService.selectStockLogList(query));
    }

    /** 低库存预警 */
    @PreAuthorize("@ss.hasPermi('pet:goods:list')")
    @GetMapping("/stock/low")
    public AjaxResult lowStock(@RequestParam(value = "threshold", required = false) Integer threshold)
    {
        return success(petGoodsService.selectLowStockGoods(threshold));
    }

    /** 入库 / 出库 / 盘亏 */
    @PreAuthorize("@ss.hasPermi('pet:stock:edit')")
    @Log(title = "库存调整", businessType = BusinessType.UPDATE)
    @PostMapping("/stock/change")
    public AjaxResult changeStock(@RequestBody PetStockLog body)
    {
        if (body.getGoodsId() == null)
        {
            return error("请选择商品");
        }
        int after = petGoodsService.changeStock(body.getGoodsId(), body.getSkuId(), body.getChangeType(),
                body.getQty(), getUsername(), body.getBizNo(), body.getRemark());
        return AjaxResult.success("库存已更新，当前库存 " + after, after);
    }
}
