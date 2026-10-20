package com.ruoyi.web.controller.system;

import java.util.Date;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import com.ruoyi.common.utils.SecurityUtils;
import com.ruoyi.common.utils.ServletUtils;
import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetDoctorConsult;
import com.ruoyi.system.domain.PetHealthIssue;
import com.ruoyi.system.service.IPetDoctorConsultService;
import com.ruoyi.system.service.IPetHealthIssueService;

/**
 * 宠物常见健康问题（疑难杂症）知识库 + 宠物医生智能问答 Controller
 *
 * 前台：游客可按分类/科系浏览（/pet/issue/front）；宠物医生问答（/pet/doctor/ask）公开。
 * 后台：增删改查需要 pet:issue:* 权限。
 *
 * @author ruoyi
 */
@RestController
@RequestMapping("/pet/issue")
public class PetHealthIssueController extends BaseController
{
    private static final Logger log = LoggerFactory.getLogger(PetHealthIssueController.class);

    @Autowired
    private IPetHealthIssueService petHealthIssueService;

    @Autowired
    private IPetDoctorConsultService petDoctorConsultService;

    @PreAuthorize("@ss.hasPermi('pet:issue:list')")
    @GetMapping("/list")
    public TableDataInfo list(PetHealthIssue petHealthIssue)
    {
        startPage();
        List<PetHealthIssue> list = petHealthIssueService.selectPetHealthIssueList(petHealthIssue);
        return getDataTable(list);
    }

    /** 前台：按分类或科系获取常见问题（游客可读）；仅传 categoryId 时自动按科系匹配 */
    @GetMapping("/front")
    public AjaxResult front(PetHealthIssue petHealthIssue)
    {
        List<PetHealthIssue> list = petHealthIssueService.selectPetHealthIssueFront(petHealthIssue);
        return success(list);
    }

    @PreAuthorize("@ss.hasPermi('pet:issue:list')")
    @GetMapping("/{issueId}")
    public AjaxResult getInfo(@PathVariable("issueId") Long issueId)
    {
        return success(petHealthIssueService.selectPetHealthIssueByIssueId(issueId));
    }

    @PreAuthorize("@ss.hasPermi('pet:issue:add')")
    @Log(title = "健康问题", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody PetHealthIssue petHealthIssue)
    {
        petHealthIssue.setCreateBy(SecurityUtils.getUsername());
        return toAjax(petHealthIssueService.insertPetHealthIssue(petHealthIssue));
    }

    @PreAuthorize("@ss.hasPermi('pet:issue:edit')")
    @Log(title = "健康问题", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody PetHealthIssue petHealthIssue)
    {
        petHealthIssue.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(petHealthIssueService.updatePetHealthIssue(petHealthIssue));
    }

    @PreAuthorize("@ss.hasPermi('pet:issue:remove')")
    @Log(title = "健康问题", businessType = BusinessType.DELETE)
    @DeleteMapping("/{issueIds}")
    public AjaxResult remove(@PathVariable Long[] issueIds)
    {
        return toAjax(petHealthIssueService.deletePetHealthIssueByIssueIds(issueIds));
    }

    /** 宠物医生智能问答：根据提问在知识库匹配健康问题并返回综合建议（公开） */
    @GetMapping("/doctor/ask")
    public AjaxResult askDoctor(@RequestParam("q") String q)
    {
        Map<String, Object> data = petHealthIssueService.askDoctor(q);
        // 记录本次咨询，供后台查看客户咨询过的问题（记录失败不影响正常问答）
        saveConsultRecord(q, data);
        return success(data);
    }

    /** 把一次咨询写入 pet_doctor_consult：含提问人、问题、回答、来源、命中条数、IP、时间 */
    private void saveConsultRecord(String question, Map<String, Object> data)
    {
        if (StringUtils.isBlank(question))
        {
            return;
        }
        try
        {
            PetDoctorConsult record = new PetDoctorConsult();
            Long userId = null;
            String userName = null;
            try
            {
                userId = SecurityUtils.getUserId();
                userName = SecurityUtils.getUsername();
            }
            catch (Exception ignored)
            {
                // 游客：未登录，无 userId
            }
            record.setUserId(userId);
            record.setUserName(userId == null ? "游客" : userName);
            record.setQuestion(cut(question, 500));

            Object answer = data.get("answer");
            record.setAnswer(cut(answer == null ? "" : answer.toString(), 2000));

            Object source = data.get("source");
            record.setSource(source == null ? "online" : source.toString());

            Object model = data.get("model");
            record.setModel(model == null ? "" : cut(model.toString(), 100));

            Object issues = data.get("issues");
            record.setMatchCount(issues instanceof List ? ((List<?>) issues).size() : 0);

            record.setIp(clientIp());
            record.setDelFlag("0");
            record.setCreateTime(new Date());
            petDoctorConsultService.insertPetDoctorConsult(record);
        }
        catch (Exception e)
        {
            log.warn("记录医生咨询失败：{}", e.getMessage());
        }
    }

    /** 取客户端真实 IP（兼容反代 X-Forwarded-For） */
    private String clientIp()
    {
        try
        {
            HttpServletRequest request = ServletUtils.getRequest();
            if (request == null)
            {
                return "";
            }
            String ip = request.getHeader("X-Forwarded-For");
            if (StringUtils.isBlank(ip) || "unknown".equalsIgnoreCase(ip))
            {
                ip = request.getHeader("X-Real-IP");
            }
            if (StringUtils.isBlank(ip) || "unknown".equalsIgnoreCase(ip))
            {
                ip = request.getRemoteAddr();
            }
            if (ip != null && ip.contains(","))
            {
                ip = ip.split(",")[0].trim();
            }
            return ip == null ? "" : ip;
        }
        catch (Exception e)
        {
            return "";
        }
    }

    /** 截断超长文本，避免超出数据库列长度 */
    private String cut(String s, int max)
    {
        if (s == null)
        {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
