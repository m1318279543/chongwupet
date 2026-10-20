-- =====================================================
-- AI 宠物智能匹配：特征库 + 问卷匹配记录
-- 用法: mysql -uroot -p123456 --default-character-set=utf8mb4 ry-pet < sql/pet_match.sql
-- =====================================================

drop table if exists pet_match_trait;
create table pet_match_trait (
  pet_id        bigint       not null comment '宠物ID',
  space_need    tinyint      not null default 1 comment '空间需求 1小户型 2普通 3大空间',
  activity_need tinyint      not null default 1 comment '运动需求 1低 2中 3高',
  care_level    tinyint      not null default 1 comment '照料投入 1低维护 2中等 3高维护',
  exp_level     tinyint      not null default 1 comment '经验门槛 1新手 2有经验 3资深',
  noise_level   tinyint      not null default 1 comment '噪音 1安静 2一般 3吵闹',
  kid_friendly  tinyint      not null default 1 comment '是否适合有小孩家庭 1是 0否',
  monthly_cost  decimal(8,2) not null default 200 comment '月均花费估算(元)',
  traits        varchar(160) default '' comment '性格/特点标签，逗号分隔',
  update_time   datetime     default current_timestamp on update current_timestamp,
  primary key (pet_id)
) engine=innodb default charset=utf8mb4 comment='宠物匹配特征库';

-- ---------- 一、按分类给默认特征 ----------
insert into pet_match_trait (pet_id, space_need, activity_need, care_level, exp_level, noise_level, kid_friendly, monthly_cost, traits)
select p.pet_id,
  case p.category_id when 1 then 1 when 2 then 2 else 1 end,
  case p.category_id when 2 then 2 when 5 then 2 else 1 end,
  case p.category_id when 2 then 2 when 3 then 2 when 5 then 2 when 6 then 2 else 1 end,
  case p.category_id when 5 then 2 when 7 then 2 else 1 end,
  case p.category_id when 2 then 2 when 5 then 3 else 1 end,
  case p.category_id when 7 then 0 else 1 end,
  case p.category_id when 1 then 260 when 2 then 520 when 3 then 150 when 4 then 80 when 5 then 150 when 6 then 180 else 150 end,
  case p.category_id
    when 1 then '爱干净,会用猫砂'
    when 2 then '忠诚,互动多,需遛弯'
    when 3 then '安静,胆小,需磨牙'
    when 4 then '省空间,夜行,低维护'
    when 5 then '爱叫,需陪伴,会互动'
    when 6 then '安静,观赏,需换水'
    else '安静,省心,需控温' end
from pet_info p;

-- ---------- 二、犬种细化 ----------
update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=3, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=800, t.traits='温顺,亲人,掉毛多,需运动'
where p.category_id=2 and (p.pet_name like '%金毛%' or p.breed like '%金毛%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=2, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=750, t.traits='温顺,聪明,运动量大'
where p.category_id=2 and (p.pet_name like '%拉布拉多%' or p.breed like '%拉布拉多%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=2, t.exp_level=2, t.noise_level=3, t.kid_friendly=1, t.monthly_cost=700, t.traits='活泼,爱叫,精力旺,拆家'
where p.category_id=2 and (p.pet_name like '%哈士奇%' or p.breed like '%雪橇犬%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=3, t.exp_level=2, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=800, t.traits='大型犬,运动量大,掉毛'
where p.category_id=2 and (p.pet_name like '%阿拉斯加%' or p.breed like '%阿拉斯加%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=2, t.activity_need=3, t.care_level=2, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=550, t.traits='活泼,粘人,爱叫,掉毛'
where p.category_id=2 and (p.pet_name like '%柯基%' or p.breed like '%柯基%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=2, t.activity_need=2, t.care_level=3, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=400, t.traits='聪明,粘人,需美容,掉毛少'
where p.category_id=2 and (p.pet_name like '%泰迪%' or p.pet_name like '%贵宾%' or p.breed like '%贵宾%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=2, t.activity_need=2, t.care_level=3, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=420, t.traits='粘人,需美容,亲人'
where p.category_id=2 and (p.pet_name like '%比熊%' or p.breed like '%比熊%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=2, t.exp_level=1, t.noise_level=3, t.kid_friendly=1, t.monthly_cost=350, t.traits='小巧,爱叫,需梳毛'
where p.category_id=2 and (p.pet_name like '%博美%' or p.breed like '%博美%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=2, t.activity_need=2, t.care_level=1, t.exp_level=2, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=450, t.traits='独立,安静,爱干净,掉毛'
where p.category_id=2 and (p.pet_name like '%柴犬%' or p.breed like '%柴犬%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=3, t.exp_level=3, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=700, t.traits='极聪明,需训练,精力旺'
where p.category_id=2 and (p.pet_name like '%边境牧羊%' or p.breed like '%边境牧羊%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=2, t.exp_level=1, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=400, t.traits='安静,粘人,怕热,打呼'
where p.category_id=2 and (p.pet_name like '%巴哥%' or p.breed like '%巴哥%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=3, t.activity_need=3, t.care_level=2, t.exp_level=3, t.noise_level=1, t.kid_friendly=0, t.monthly_cost=850, t.traits='护卫犬,力量大,需训练'
where p.category_id=2 and (p.pet_name like '%罗威纳%' or p.pet_name like '%杜宾%' or p.breed like '%罗威纳%' or p.breed like '%杜宾%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=2, t.activity_need=3, t.care_level=2, t.exp_level=3, t.noise_level=2, t.kid_friendly=1, t.monthly_cost=700, t.traits='猎犬,运动量大,需经验'
where p.category_id=2 and (p.pet_name like '%法老王%' or p.breed like '%法老王%');

-- ---------- 三、猫种细化 ----------
update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=3, t.exp_level=1, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=420, t.traits='温顺,粘人,长毛需打理,安静'
where p.category_id=1 and (
  p.pet_name like '%布偶%' or p.pet_name like '%加菲%' or p.pet_name like '%波斯%'
  or p.pet_name like '%金吉拉%' or p.pet_name like '%狮子猫%' or p.pet_name like '%森林猫%'
  or p.breed like '%布偶%' or p.breed like '%异国短毛%' or p.breed like '%波斯%'
  or p.breed like '%金吉拉%' or p.breed like '%西伯利亚%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=2, t.care_level=1, t.exp_level=2, t.noise_level=3, t.kid_friendly=1, t.monthly_cost=350, t.traits='爱叫,活泼,粘人,话痨'
where p.category_id=1 and (p.pet_name like '%暹罗%' or p.pet_name like '%埃及猫%' or p.breed like '%暹罗%' or p.breed like '%埃及%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=1, t.exp_level=1, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=250, t.traits='安静,低维护,独立,爱干净'
where p.category_id=1 and (
  p.pet_name like '%银渐层%' or p.pet_name like '%美短%' or p.pet_name like '%狸花%'
  or p.pet_name like '%英国短毛%' or p.pet_name like '%美国短毛%'
  or p.breed in ('英国短毛猫','美国短毛猫','中国狸花猫'));

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=2, t.exp_level=1, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=320, t.traits='温顺,粘人,需关注骨骼健康'
where p.category_id=1 and (p.pet_name like '%折耳%' or p.breed like '%折耳%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=2, t.care_level=3, t.exp_level=2, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=380, t.traits='粘人,无毛,需常洗澡'
where p.category_id=1 and (p.pet_name like '%无毛%' or p.pet_name like '%斯芬克斯%' or p.breed like '%斯芬克斯%' or p.breed like '%无毛%');

update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.space_need=1, t.activity_need=1, t.care_level=1, t.exp_level=2, t.noise_level=1, t.kid_friendly=1, t.monthly_cost=300, t.traits='安静,独立,不掉毛'
where p.category_id=1 and (p.pet_name like '%俄罗斯蓝猫%' or p.breed like '%俄罗斯蓝猫%');

-- ---------- 四、其他细化 ----------
update pet_match_trait t join pet_info p on p.pet_id = t.pet_id
set t.care_level=3 where p.pet_name like '%安哥拉兔%';

-- ---------- 五、匹配记录表 ----------
drop table if exists pet_match_record;
create table pet_match_record (
  record_id     bigint auto_increment primary key,
  user_id       bigint       default null comment '用户ID(匿名可空)',
  user_name     varchar(64)  default '' comment '用户名',
  answers       varchar(1000) default '' comment '问卷答案JSON',
  top_pet_id    bigint       default null,
  top_pet_name  varchar(50)  default '',
  top_score     decimal(5,1) default 0,
  result_pets   varchar(500) default '' comment '推荐结果概览',
  result_detail text comment '推荐明细JSON',
  match_status  char(1)      default '0' comment '匹配状态(0有结果/1无匹配)',
  diagnosis     varchar(1000) default '' comment '无匹配诊断JSON',
  algorithm     varchar(64)  default 'rule-engine+cf' comment '算法说明',
  create_time   datetime     default current_timestamp,
  del_flag      char(1)      default '0',
  key idx_match_user (user_id),
  key idx_match_time (create_time),
  key idx_match_status (match_status)
) engine=innodb default charset=utf8mb4 comment='AI宠物匹配问卷记录';

select '特征覆盖' as item, count(*) as cnt from pet_match_trait
union all select '高维护(>=3)', count(*) from pet_match_trait where care_level>=3
union all select '新手友好', count(*) from pet_match_trait where exp_level=1
union all select '公寓友好', count(*) from pet_match_trait where space_need=1;
