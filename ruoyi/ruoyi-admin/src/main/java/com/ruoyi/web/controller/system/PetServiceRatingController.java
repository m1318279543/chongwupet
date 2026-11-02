package com.ruoyi.web.controller.system;

import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.ruoyi.common.core.controller.BaseController;
import com.ruoyi.common.core.domain.AjaxResult;
import com.ruoyi.common.core.domain.model.LoginUser;
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.system.domain.PetComment;
import com.ruoyi.system.service.IPetCommentService;

/**
 * 门店服务评价（顾客自己打分 + 写评论）
 *
 * 数据落在 pet_comment：target_type='service'、pet_id=0，与宠物/宠物粮评论隔离。
 * 游客可读汇总（/stat），打分/写评价需登录。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/service/rating")
public class PetServiceRatingController extends BaseController
{
    /** 服务评价在 pet_comment 里的固定锚点 */
    private static final Long SERVICE_TARGET_ID = 0L;
    private static final String SERVICE_TARGET_TYPE = "service";

    @Autowired
    private IPetCommentService commentService;

    /**
     * 评分汇总 + 我最近的评价（游客访问时 mine 为 null）
     */
    @GetMapping("/stat")
    public AjaxResult stat()
    {
        Map<String, Object> data = new HashMap<>();
        data.putAll(commentService.scoreStat(SERVICE_TARGET_ID, SERVICE_TARGET_TYPE));
        data.put("count", commentService.countByPetId(SERVICE_TARGET_ID, SERVICE_TARGET_TYPE));
        PetComment mine = latestMine();
        if (mine != null)
        {
            Map<String, Object> m = new HashMap<>();
            m.put("score", mine.getScore());
            m.put("content", mine.getContent());
            m.put("createTime", mine.getCreateTime());
            data.put("mine", m);
        }
        else
        {
            data.put("mine", null);
        }
        return success(data);
    }

    /**
     * 提交服务评价：星级 1~5 + 文字（可留空）
     */
    @PostMapping
    public AjaxResult submit(@RequestBody(required = false) Map<String, Object> body)
    {
        Object rawScore = body == null ? null : body.get("score");
        Integer score = null;
        if (rawScore != null)
        {
            try
            {
                score = (int) Double.parseDouble(String.valueOf(rawScore));
            }
            catch (Exception ignored)
            {
                score = null;
            }
        }
        if (score == null || score < 1 || score > 5)
        {
            return error("请先选择 1~5 星");
        }
        Object rawContent = body == null ? null : body.get("content");
        String content = rawContent == null ? "" : String.valueOf(rawContent).trim();
        if (content.isEmpty())
        {
            content = "该顾客未填写文字评价";
        }
        if (content.length() > 500)
        {
            return error("评价内容不能超过 500 字");
        }

        // 一人一条服务评价：评过就改分/改文字，不再追加新行
        PetComment exist = latestMine();
        if (exist != null)
        {
            PetComment patch = new PetComment();
            patch.setCommentId(exist.getCommentId());
            patch.setScore(score);
            if (!content.equals("该顾客未填写文字评价"))
            {
                patch.setContent(content);
            }
            patch.setUpdateBy(SecurityUtils.getUsername());
            commentService.updatePetComment(patch);
        }
        else
        {
            PetComment comment = new PetComment();
            comment.setPetId(SERVICE_TARGET_ID);
            comment.setTargetType(SERVICE_TARGET_TYPE);
            comment.setUserId(SecurityUtils.getUserId());
            comment.setCreateBy(SecurityUtils.getUsername());
            comment.setParentId(0L);
            comment.setStatus("0");
            comment.setScore(score);
            comment.setContent(content);
            commentService.insertPetComment(comment);
        }

        Map<String, Object> data = new HashMap<>();
        data.putAll(commentService.scoreStat(SERVICE_TARGET_ID, SERVICE_TARGET_TYPE));
        data.put("count", commentService.countByPetId(SERVICE_TARGET_ID, SERVICE_TARGET_TYPE));
        data.put("score", score);
        return AjaxResult.success("感谢您的评价", data);
    }

    /** 当前登录用户最近一条服务评价；游客返回 null */
    private PetComment latestMine()
    {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof LoginUser))
        {
            return null;
        }
        PetComment query = new PetComment();
        query.setUserId(((LoginUser) auth.getPrincipal()).getUserId());
        query.setPetId(SERVICE_TARGET_ID);
        query.setTargetType(SERVICE_TARGET_TYPE);
        java.util.List<PetComment> list = commentService.selectPetCommentList(query);
        return list.isEmpty() ? null : list.get(0);
    }
}
