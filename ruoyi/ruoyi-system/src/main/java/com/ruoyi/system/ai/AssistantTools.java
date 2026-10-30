package com.ruoyi.system.ai;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ruoyi.common.utils.StringUtils;
import com.ruoyi.system.domain.PetAppointment;
import com.ruoyi.system.domain.PetCustomer;
import com.ruoyi.system.domain.PetGoods;
import com.ruoyi.system.domain.PetHealth;
import com.ruoyi.system.domain.PetInfo;
import com.ruoyi.system.domain.PetOrder;
import com.ruoyi.system.domain.PetOrderItem;
import com.ruoyi.system.domain.PetOwner;
import com.ruoyi.system.domain.PetPreference;
import com.ruoyi.system.domain.PetServiceOrder;
import com.ruoyi.system.domain.PetStore;
import com.ruoyi.system.service.IPetAppointmentService;
import com.ruoyi.system.service.IPetCustomerService;
import com.ruoyi.system.service.IPetGoodsService;
import com.ruoyi.system.service.IPetHealthService;
import com.ruoyi.system.service.IPetInfoService;
import com.ruoyi.system.service.IPetMatchService;
import com.ruoyi.system.service.IPetOrderService;
import com.ruoyi.system.service.IPetPreferenceService;
import com.ruoyi.system.service.IPetServiceOrderService;
import com.ruoyi.system.service.IPetStoreService;

/**
 * 只读工具集：AI 只能通过这里取业务数据，不直接写 SQL、不直接改表。
 *
 * 所有方法返回 Map/List，编排层可直接转成前端卡片。
 *
 * @author ruoyi
 */
@Service
public class AssistantTools
{
    private static final SimpleDateFormat DATE = new SimpleDateFormat("yyyy-MM-dd");
    private static final SimpleDateFormat DATETIME = new SimpleDateFormat("yyyy-MM-dd HH:mm");

    @Autowired
    private IPetInfoService petInfoService;

    @Autowired
    private IPetGoodsService petGoodsService;

    @Autowired
    private IPetHealthService petHealthService;

    @Autowired
    private IPetPreferenceService petPreferenceService;

    @Autowired
    private IPetOrderService petOrderService;

    @Autowired
    private IPetAppointmentService petAppointmentService;

    @Autowired
    private IPetStoreService petStoreService;

    @Autowired
    private IPetMatchService petMatchService;

    @Autowired
    private com.ruoyi.system.mapper.PetMatchMapper petMatchMapper;

    @Autowired
    private IPetCustomerService petCustomerService;

    @Autowired
    private IPetServiceOrderService petServiceOrderService;

    /** 当前登录用户名下的宠物（客户档案 → 宠物归属） */
    public List<Map<String, Object>> myPets(Long userId)
    {
        List<Map<String, Object>> list = new ArrayList<>();
        if (userId == null)
        {
            return list;
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        if (customer == null)
        {
            return list;
        }
        List<PetOwner> owners = petCustomerService.selectPetsByCustomerId(customer.getCustomerId());
        if (owners == null)
        {
            return list;
        }
        for (PetOwner owner : owners)
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("petId", owner.getPetId());
            m.put("petName", owner.getPetName());
            m.put("image", owner.getImage());
            m.put("breed", owner.getBreed());
            m.put("age", owner.getAge());
            m.put("categoryName", owner.getCategoryName());
            m.put("relation", owner.getRelation());
            m.put("price", money(owner.getPrice()));
            PetHealth health = petHealthService.selectPetHealthByPetId(owner.getPetId());
            if (health != null)
            {
                m.put("healthLevel", health.getHealthLevel());
                m.put("vaccine", join(health.getVaccineName(), health.getVaccineProgress()));
                m.put("vaccineDate", date(health.getVaccineDate()));
                m.put("dewormDate", date(health.getDewormDate()));
                m.put("reminder", reminder(health));
            }
            list.add(m);
        }
        return list;
    }

    /** 我的某只宠物：档案 + 偏好 + 养护提醒 + 最近服务记录（带归属校验） */
    public Map<String, Object> petCare(Long petId, Long userId)
    {
        if (petId == null || userId == null || !ownsPet(petId, userId))
        {
            return null;
        }
        Map<String, Object> map = petDetail(petId);
        if (map == null)
        {
            return null;
        }
        PetHealth health = petHealthService.selectPetHealthByPetId(petId);
        if (health != null)
        {
            map.put("reminder", reminder(health));
            map.put("healthNote", health.getHealthNote());
            map.put("aftersaleNote", health.getAftersaleNote());
            map.put("examHospital", health.getExamHospital());
        }
        List<Map<String, Object>> services = new ArrayList<>();
        PetServiceOrder query = new PetServiceOrder();
        query.setUserId(userId);
        query.setPetId(petId);
        List<PetServiceOrder> orders = petServiceOrderService.selectPetServiceOrderList(query);
        int count = 0;
        for (PetServiceOrder one : orders)
        {
            if (count >= 3)
            {
                break;
            }
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("serviceNo", one.getServiceNo());
            s.put("itemName", one.getItemName());
            s.put("appointTime", datetime(one.getAppointTime()));
            s.put("status", one.getStatus());
            s.put("staffName", one.getStaffName());
            services.add(s);
            count++;
        }
        map.put("services", services);
        return map;
    }

    /** 归属校验：宠物必须挂在当前用户的客户档案下 */
    public boolean ownsPet(Long petId, Long userId)
    {
        if (petId == null || userId == null)
        {
            return false;
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        if (customer == null)
        {
            return false;
        }
        List<PetOwner> owners = petCustomerService.selectPetsByCustomerId(customer.getCustomerId());
        if (owners == null)
        {
            return false;
        }
        for (PetOwner one : owners)
        {
            if (petId.equals(one.getPetId()))
            {
                return true;
            }
        }
        return false;
    }

    /** 客户档案里的联系电话，用于预约表单预填 */
    public String customerPhone(Long userId)
    {
        if (userId == null)
        {
            return "";
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        return customer == null || customer.getPhone() == null ? "" : customer.getPhone();
    }

    /** 客户档案里的默认门店 */
    public Long customerStoreId(Long userId)
    {
        if (userId == null)
        {
            return null;
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        return customer == null ? null : customer.getStoreId();
    }

    /** 门店名称 */
    public String storeName(Long storeId)
    {
        if (storeId == null)
        {
            return "";
        }
        List<Map<String, Object>> list = stores();
        for (Map<String, Object> one : list)
        {
            if (storeId.equals(toLongValue(one.get("storeId"))))
            {
                return String.valueOf(one.get("storeName"));
            }
        }
        return "";
    }

    private static Long toLongValue(Object value)
    {
        if (value instanceof Number)
        {
            return ((Number) value).longValue();
        }
        try
        {
            return Long.parseLong(String.valueOf(value));
        }
        catch (Exception e)
        {
            return null;
        }
    }

    /** 从用户原话里找我名下宠物的名字 */
    public PetOwner matchMyPet(Long userId, String message)    {
        if (userId == null || StringUtils.isBlank(message))
        {
            return null;
        }
        PetCustomer customer = petCustomerService.selectPetCustomerByUserId(userId);
        if (customer == null)
        {
            return null;
        }
        List<PetOwner> owners = petCustomerService.selectPetsByCustomerId(customer.getCustomerId());
        if (owners == null)
        {
            return null;
        }
        for (PetOwner one : owners)
        {
            String name = one.getPetName();
            if (StringUtils.isNotBlank(name) && name.length() >= 2 && message.contains(name))
            {
                return one;
            }
        }
        return null;
    }

    /** 疫苗/驱虫到期提醒：按年度加强、90 天驱虫估算 */
    private static String reminder(PetHealth health)
    {
        List<String> parts = new ArrayList<>();
        if (health.getVaccineDate() != null)
        {
            parts.add(cycle("疫苗", health.getVaccineDate(), 365));
        }
        if (health.getDewormDate() != null)
        {
            parts.add(cycle("驱虫", health.getDewormDate(), 90));
        }
        if (parts.isEmpty())
        {
            return "档案里还没有疫苗和驱虫记录";
        }
        return String.join("；", parts);
    }

    private static String cycle(String name, Date last, int days)
    {
        long passed = (System.currentTimeMillis() - last.getTime()) / 86400000L;
        long left = days - passed;
        if (left < 0)
        {
            return name + "已超期 " + (-left) + " 天";
        }
        if (left <= 15)
        {
            return name + "还有 " + left + " 天到期";
        }
        return name + "下次约在 " + left + " 天后";
    }

    /** 在售宠物检索：名称与品种各查一次后合并 */
    public List<Map<String, Object>> searchPets(String keyword, Long storeId, int limit)
    {
        Map<Long, PetInfo> merged = new LinkedHashMap<>();
        List<String> terms = split(keyword);
        if (terms.isEmpty())
        {
            PetInfo query = new PetInfo();
            query.setStatus("0");
            query.setStoreId(storeId);
            for (PetInfo one : petInfoService.selectPetInfoList(query))
            {
                merged.put(one.getPetId(), one);
                if (merged.size() >= limit)
                {
                    break;
                }
            }
        }
        else
        {
            for (String term : terms)
            {
                PetInfo byName = new PetInfo();
                byName.setStatus("0");
                byName.setStoreId(storeId);
                byName.setPetName(term);
                collect(merged, petInfoService.selectPetInfoList(byName), limit);

                PetInfo byBreed = new PetInfo();
                byBreed.setStatus("0");
                byBreed.setStoreId(storeId);
                byBreed.setBreed(term);
                collect(merged, petInfoService.selectPetInfoList(byBreed), limit);
            }
        }
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetInfo one : merged.values())
        {
            list.add(petCard(one));
            if (list.size() >= limit)
            {
                break;
            }
        }
        return list;
    }

    /** 宠物详情：档案 + 偏好，用于"它适合我吗"这类问题 */
    public Map<String, Object> petDetail(Long petId)
    {
        PetInfo pet = petInfoService.selectPetInfoByPetId(petId);
        if (pet == null)
        {
            return null;
        }
        Map<String, Object> map = petCard(pet);
        Integer monthlyCost = petMatchMapper.selectMonthlyCost(petId);
        if (monthlyCost != null)
        {
            map.put("monthlyCost", monthlyCost);
        }
        PetHealth health = petHealthService.selectPetHealthByPetId(petId);
        if (health != null)
        {
            Map<String, Object> h = new LinkedHashMap<>();
            h.put("healthLevel", health.getHealthLevel());
            h.put("vaccine", join(health.getVaccineName(), health.getVaccineProgress()));
            h.put("vaccineDate", date(health.getVaccineDate()));
            h.put("deworm", health.getDewormName());
            h.put("dewormDate", date(health.getDewormDate()));
            h.put("examResult", health.getExamResult());
            h.put("examDate", date(health.getExamDate()));
            h.put("temperament", health.getTemperament());
            h.put("feedPlan", health.getFeedPlan());
            h.put("carePoints", health.getCarePoints());
            h.put("skillLevel", health.getSkillLevel());
            h.put("guaranteeDays", health.getGuaranteeDays());
            map.put("health", h);
        }
        PetPreference preference = petPreferenceService.selectPetPreferenceByPetId(petId);
        if (preference != null)
        {
            Map<String, Object> p = new LinkedHashMap<>();
            p.put("foodLike", preference.getFoodLike());
            p.put("toyLike", preference.getToyLike());
            p.put("personality", preference.getPersonality());
            p.put("activityLevel", preference.getActivityLevel());
            p.put("envLike", preference.getEnvLike());
            p.put("taboo", preference.getTaboo());
            map.put("preference", p);
        }
        return map;
    }

    /** 商品检索 */
    public List<Map<String, Object>> searchGoods(String keyword, String cat, int limit)
    {
        PetGoods query = new PetGoods();
        query.setStatus("0");
        query.setCat(cat);
        query.setKeyword(keyword);
        List<PetGoods> rows = petGoodsService.selectPetGoodsList(query);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetGoods one : rows)
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("goodsId", one.getGoodsId());
            m.put("goodsName", one.getGoodsName());
            m.put("cat", one.getCat());
            m.put("spec", one.getSpec());
            m.put("price", money(one.getPrice()));
            m.put("stock", one.getStock());
            m.put("stage", one.getStage());
            m.put("tags", one.getTags());
            m.put("image", one.getImage());
            m.put("feeding", one.getFeeding());
            list.add(m);
            if (list.size() >= limit)
            {
                break;
            }
        }
        return list;
    }

    /** 我的订单（不含明细，避免一次拉太多） */
    public List<Map<String, Object>> myOrders(Long userId, int limit)
    {
        if (userId == null)
        {
            return new ArrayList<>();
        }
        List<PetOrder> rows = petOrderService.selectMyOrders(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetOrder one : rows)
        {
            if (list.size() >= limit)
            {
                break;
            }
            list.add(orderCard(one));
        }
        return list;
    }

    /** 我已支付且未取消的订单：订单咨询/售后场景专用，已取消单不进入咨询列表 */
    public List<Map<String, Object>> myPaidOrders(Long userId, int limit)
    {
        if (userId == null)
        {
            return new ArrayList<>();
        }
        List<PetOrder> rows = petOrderService.selectMyOrders(userId);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetOrder one : rows)
        {
            if (list.size() >= limit)
            {
                break;
            }
            if ("1".equals(one.getPayStatus()) && !"3".equals(one.getStatus()))
            {
                list.add(orderCard(one));
            }
        }
        return list;
    }

    private Map<String, Object> orderCard(PetOrder one)
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("orderNo", one.getOrderNo());
        m.put("orderType", one.getOrderType());
        m.put("status", one.getStatus());
        m.put("payStatus", one.getPayStatus());
        m.put("payAmount", money(one.getPayAmount()));
        m.put("itemCount", one.getItemCount());
        m.put("storeName", one.getStoreName());
        m.put("createTime", datetime(one.getCreateTime()));
        m.put("firstItem", firstItem(one));
        return m;
    }

    /** 订单详情，带归属校验 */
    public Map<String, Object> orderDetail(String orderNo, Long userId)
    {
        if (StringUtils.isBlank(orderNo))
        {
            return null;
        }
        PetOrder order = petOrderService.selectPetOrderByNo(orderNo.trim());
        if (order == null)
        {
            return null;
        }
        if (userId != null && order.getUserId() != null && !userId.equals(order.getUserId()))
        {
            return null;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("orderNo", order.getOrderNo());
        m.put("orderType", order.getOrderType());
        m.put("status", order.getStatus());
        m.put("payStatus", order.getPayStatus());
        m.put("payMethod", order.getPayMethod());
        m.put("totalAmount", money(order.getTotalAmount()));
        m.put("payAmount", money(order.getPayAmount()));
        m.put("deliveryType", order.getDeliveryType());
        m.put("receiver", order.getReceiver());
        m.put("receiverPhone", order.getReceiverPhone());
        m.put("receiverAddress", order.getReceiverAddress());
        m.put("cancelReason", order.getCancelReason());
        m.put("createTime", datetime(order.getCreateTime()));
        m.put("payTime", datetime(order.getPayTime()));
        m.put("storeName", order.getStoreName());
        List<Map<String, Object>> items = new ArrayList<>();
        if (order.getItems() != null)
        {
            for (PetOrderItem item : order.getItems())
            {
                Map<String, Object> line = new LinkedHashMap<>();
                line.put("name", item.getGoodsName());
                line.put("spec", item.getGoodsSpec());
                line.put("price", money(item.getPrice()));
                line.put("qty", item.getQty());
                items.add(line);
            }
        }
        m.put("items", items);
        return m;
    }

    /** 我的预约 */
    public List<Map<String, Object>> myAppointments(Long userId, int limit)
    {
        if (userId == null)
        {
            return new ArrayList<>();
        }
        PetAppointment query = new PetAppointment();
        query.setUserId(userId);
        List<PetAppointment> rows = petAppointmentService.selectPetAppointmentList(query);
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetAppointment one : rows)
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("appointmentId", one.getAppointmentId());
            m.put("petName", one.getPetName());
            m.put("storeId", one.getStoreId());
            m.put("appointmentDate", datetime(one.getAppointmentDate()));
            m.put("status", one.getStatus());
            list.add(m);
            if (list.size() >= limit)
            {
                break;
            }
        }
        return list;
    }

    /** 门店与可预约时段 */
    public List<Map<String, Object>> stores()
    {
        List<PetStore> rows = petStoreService.selectPetStoreList(new PetStore());
        List<Map<String, Object>> list = new ArrayList<>();
        for (PetStore one : rows)
        {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("storeId", one.getStoreId());
            m.put("storeName", one.getStoreName());
            m.put("address", one.getAddress());
            m.put("phone", one.getPhone());
            m.put("businessHours", one.getBusinessHours());
            list.add(m);
        }
        return list;
    }

    public List<Map<String, Object>> slots(Long storeId, String date)
    {
        if (storeId == null || StringUtils.isBlank(date))
        {
            return new ArrayList<>();
        }
        return petAppointmentService.selectSlots(storeId, date);
    }

    /** 复用现有匹配引擎 */
    @SuppressWarnings("unchecked")
    public Map<String, Object> match(Map<String, Object> answers)
    {
        return petMatchService.recommend(answers == null ? new LinkedHashMap<>() : answers);
    }

    /* ---------- 卡片组装 ---------- */

    private Map<String, Object> petCard(PetInfo one)
    {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("petId", one.getPetId());
        m.put("petName", one.getPetName());
        m.put("breed", one.getBreed());
        m.put("age", one.getAge());
        m.put("gender", one.getGender());
        m.put("price", money(one.getPrice()));
        m.put("image", one.getImage());
        m.put("storeId", one.getStoreId());
        m.put("description", abbreviate(one.getDescription(), 80));
        m.put("status", one.getStatus());
        return m;
    }

    private void collect(Map<Long, PetInfo> merged, List<PetInfo> rows, int limit)
    {
        if (rows == null)
        {
            return;
        }
        for (PetInfo one : rows)
        {
            if (merged.size() >= limit * 3)
            {
                return;
            }
            merged.putIfAbsent(one.getPetId(), one);
        }
    }

    private String firstItem(PetOrder order)
    {
        if (order.getItems() != null && !order.getItems().isEmpty())
        {
            return order.getItems().get(0).getGoodsName();
        }
        return order.getOrderType() != null && "2".equals(order.getOrderType()) ? "宠物订单" : "商品订单";
    }

    private static List<String> split(String keyword)
    {
        List<String> list = new ArrayList<>();
        if (StringUtils.isBlank(keyword))
        {
            return list;
        }
        for (String piece : keyword.trim().split("[\\s,，、;；]+"))
        {
            String value = piece.trim();
            if (value.length() >= 1 && value.length() <= 12)
            {
                list.add(value);
            }
        }
        return list;
    }

    private static Double money(BigDecimal value)
    {
        return value == null ? 0D : value.doubleValue();
    }

    private static String date(Date value)
    {
        return value == null ? "" : DATE.format(value);
    }

    private static String datetime(Date value)
    {
        return value == null ? "" : DATETIME.format(value);
    }

    private static String join(String a, String b)
    {
        String left = StringUtils.isBlank(a) ? "" : a;
        String right = StringUtils.isBlank(b) ? "" : b;
        return (left + " " + right).trim();
    }

    private static String abbreviate(String text, int max)
    {
        if (text == null)
        {
            return "";
        }
        return text.length() <= max ? text : text.substring(0, max) + "…";
    }
}
