#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
生成「最近半个月」的演示数据：
  1) 每只宠物、每款宠物粮都有 4~8 条评论（含楼中楼回复、点赞数、评分）
  2) 近 15 天的订单（已支付 / 已完成 / 待支付 / 已取消，含宠物单、粮单、混合单）
输出：sql/seed_comments_orders_15d.sql（可重复执行：会先清掉上一批 seed15d 数据）

用法：
  mysql ... -N -B ry-pet -e "select ..." > /tmp/seed_*.tsv   # 见下方三张表
  python sql/gen_seed_15d.py
"""
import io
import os
import random
import tempfile
from datetime import datetime, timedelta

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'sql', 'seed_comments_orders_15d.sql')

rnd = random.Random(20261105)

def pick_user(exclude=None):
    pool = [u for u in users if u[0] != exclude]
    weights = [4 if u[0] in (2, 104, 105, 106) else (2 if u[0] == 107 else 1) for u in pool]
    return rnd.choices(pool, weights=weights)[0]

U2_SEEN = [0]  # ry 账号订单序号：第 1 单待支付、第 2 单已取消
NOW = datetime(2026, 11, 5, 19, 0, 0)
DAYS = 15
START = NOW - timedelta(days=DAYS - 1)
START = START.replace(hour=9, minute=0, second=0, microsecond=0)


def read_tsv(path):
    rows = []
    with io.open(path, encoding='utf-8') as f:
        for line in f:
            line = line.rstrip('\n')
            if line:
                rows.append(line.split('\t'))
    return rows


pets = [(int(r[0]), r[1], float(r[2]), r[3], r[4]) for r in read_tsv(os.path.join(tempfile.gettempdir(), 'seed_pets.tsv'))]
goods = [(int(r[0]), r[1], float(r[2]), r[3], r[4], int(r[5]), r[6]) for r in read_tsv(os.path.join(tempfile.gettempdir(), 'seed_goods.tsv'))]
users = [(int(r[0]), r[1]) for r in read_tsv(os.path.join(tempfile.gettempdir(), 'seed_users.tsv'))]

# ---------- 文案池 ----------
PET_TOP = [
    '到家第 {d} 天了，精神食欲都正常，晚上也不闹，性格比想象中黏人。',
    '门店环境比照片看起来还干净，{pet}的笼舍每天有人打扫，异味很小。',
    '健康记录当场就能查到，疫苗本、驱虫时间都写得很清楚，买得放心。',
    '第一次养宠，店员从喂食到洗澡讲了一个多小时，还给了一份喂养清单。',
    '品相和照片基本一致，没有滤镜，{pet}到家适应了三天就开始到处探索了。',
    '价格透明，没有额外费用，签合同的时候条款也解释得很清楚。',
    '{pet}到家时状态很好，运输箱里还垫了软垫，看得出是用心在做的。',
    '对比了三家店，这家的健康档案最完整，售后期也比别家长。',
    '带回家一周，吃喝拉撒都正常，性格温和，家里小孩也不怕它。',
    '客服回复很快，问了很多新手问题都耐心解答，没有催单。',
    '{pet}特别亲人，第一天就愿意上手，应该是平时有好好social。',
    '门店可以现场看宠，笼子打开让你慢慢接触，不会催你做决定。',
    '已经在店里买过两次了，这次是给朋友推荐来的，品质稳定。',
    '体检报告是最近一周的，还附了化验单照片，这点很加分。',
    '售后的养护群一直在，半夜问问题也有人回，挺安心的。',
]
PET_REPLY = [
    '感谢支持～{pet}到家后有任何喂养问题都可以随时联系我们。',
    '同款！我家那只也是到家第三天就开始到处跑了。',
    '请问一下你家用的是哪种猫砂/垫料呀？想参考下。',
    '健康档案确实做得细，我上次也注意到疫苗本写得很全。',
    '恭喜接回家，记得前两周先别洗澡哦。',
    '谢谢分享，正准备周末去门店看看这只。',
    '门店在解放碑这边对吧？上次路过看到环境还不错。',
    '收到，感谢反馈，已经同步给门店养护同事了～',
]
FOOD_TOP = [
    '{g}颗粒大小合适，{spec}这规格一只猫能吃三周左右，性价比不错。',
    '换粮按七天过渡法来的，没有软便，适口性比之前那款好。',
    '包装完好，生产日期很新，保质期还剩一年多。',
    '我家挑食的主子居然主动吃，回购第二次了。',
    '{g}的味道不算腥，家里人说闻着还行，不会满屋子味道。',
    '吃了半个月，毛色亮了一些，便便也成型，会继续观察。',
    '分量足，密封条好用，开封后放一个月也没受潮。',
    '对比了几款同价位的，这款粗蛋白含量高一些，配方也干净。',
    '两只猫一起吃也不打架，说明味道确实可以。',
    '物流第二天就到了，包装没有破损，外箱还加了防撞。',
    '之前吃别的粮有点泪痕，换这款之后好了一些，继续吃着看。',
    '客服根据猫咪年龄推荐了这款，确实比乱买合适。',
    '{g}泡软之后幼猫也能吃，断奶期过渡很顺。',
    '价格比其他平台便宜一点，活动时囤了两袋。',
]
FOOD_REPLY = [
    '感谢反馈～换粮记得继续保持七天过渡，肠胃会更稳。',
    '同款，我家两只也吃这个，便便情况一直很好。',
    '请问开封后是常温保存吗？还是要放冰箱？',
    '这个规格我家单猫吃了快一个月，确实划算。',
    '收藏了，等家里这袋吃完试试。',
    '客服推荐的没错，按年龄段选粮确实更省心。',
    '谢谢分享，正准备给幼猫换粮，参考到了。',
]

STREETS = [
    '重庆市渝中区解放碑步行街88号', '重庆市江北区观音桥北城天街5号', '重庆市九龙坡区科园四路12号',
    '重庆市南岸区南坪西路28号', '重庆市沙坪坝区三峡广场10号', '重庆市渝北区龙湖时代天街3号',
    '重庆市巴南区龙洲湾街道16号', '重庆市九龙坡区杨家坪西城天街7号',
]
SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '周', '吴', '徐', '孙', '胡']


def phone():
    return '1' + rnd.choice(['3', '5', '7', '8', '9']) + ''.join(str(rnd.randint(0, 9)) for _ in range(9))


def ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')


def rand_time_in_window(day_offset_max=DAYS - 1):
    d = rnd.randint(0, day_offset_max)
    base = (NOW - timedelta(days=d)).replace(hour=rnd.randint(9, 21), minute=rnd.randint(0, 59), second=rnd.randint(0, 59))
    return min(base, NOW)


def q(s):
    return "'" + s.replace("'", "''") + "'"


lines = []
w = lines.append
w('-- 自动生成：最近半个月评论 + 订单演示数据（每只宠物 / 每款粮 / 近 15 天订单）')
w('-- 生成器：sql/gen_seed_15d.py   可重复执行（先清上一批 create_by/order_no 标记数据）')
w('SET NAMES utf8mb4;')
w('')
w('-- 清理上一批演示数据（只删本脚本插入的）')
w("DELETE l FROM pet_comment_like l JOIN pet_comment c ON c.comment_id = l.comment_id WHERE c.create_by = 'seed15d';")
w("DELETE FROM pet_comment WHERE create_by = 'seed15d';")
w("DELETE FROM pet_order_item WHERE order_no LIKE 'S15D%';")
w("DELETE FROM pet_order WHERE order_no LIKE 'S15D%';")
w('')

comment_count = 0

# ---------- 1) 每只宠物 ----------
for pet_id, pet_name, price, image, status in pets:
    n_top = rnd.randint(4, 8)
    tops = []
    used = set()
    for _ in range(n_top):
        text = rnd.choice(PET_TOP).format(pet=pet_name, d=rnd.randint(2, 13))
        if text in used:
            continue
        used.add(text)
        uid, uname = pick_user()
        score = rnd.choices([5, 4, 3], weights=[6, 3, 1])[0]
        like = rnd.randint(0, 26)
        t = rand_time_in_window()
        tops.append((uid, uname, text, score, like, t))

    for uid, uname, text, score, like, t in tops:
        w('INSERT INTO pet_comment (pet_id, target_type, user_id, parent_id, reply_user, content, score, like_count, status, del_flag, create_by, create_time) '
          'VALUES (%d, %s, %d, 0, NULL, %s, %d, %d, %s, %s, %s, %s);'
          % (pet_id, q('pet'), uid, q(text), score, like, q('0'), q('0'), q('seed15d'), q(ts(t))))
        comment_count += 1
        n_reply = rnd.choices([0, 1, 2, 3], weights=[4, 4, 2, 1])[0]
        if n_reply == 0:
            continue
        w('SET @p := LAST_INSERT_ID();')
        vals = []
        for _ in range(n_reply):
            ruid, runame = pick_user(uid)
            rtext = rnd.choice(PET_REPLY).format(pet=pet_name)
            rt = t + timedelta(minutes=rnd.randint(20, 60 * 6))
            if rt.hour < 9 or rt.hour > 22:
                rt = rt.replace(hour=rnd.randint(9, 21), minute=rnd.randint(0, 59))
            rt = min(rt, NOW)
            vals.append('(%d, %s, %d, @p, %s, %s, NULL, %d, %s, %s, %s, %s)'
                        % (pet_id, q('pet'), ruid, q(uname), q(rtext), rnd.randint(0, 9), q('0'), q('0'), q('seed15d'), q(ts(rt))))
            comment_count += 1
        w('INSERT INTO pet_comment (pet_id, target_type, user_id, parent_id, reply_user, content, score, like_count, status, del_flag, create_by, create_time) VALUES '
          + ', '.join(vals) + ';')

# ---------- 2) 每款宠物粮（fid = 1000 + goods_id） ----------
for gid, gname, price, spec, image, stock, code in goods:
    fid = 1000 + gid
    n_top = rnd.randint(5, 8)
    tops = []
    used = set()
    for _ in range(n_top):
        text = rnd.choice(FOOD_TOP).format(g=gname, spec=spec or '标准装')
        if text in used:
            continue
        used.add(text)
        uid, uname = pick_user()
        score = rnd.choices([5, 4, 3], weights=[6, 3, 1])[0]
        like = rnd.randint(0, 40)
        t = rand_time_in_window()
        tops.append((uid, uname, text, score, like, t))

    for uid, uname, text, score, like, t in tops:
        w('INSERT INTO pet_comment (pet_id, target_type, user_id, parent_id, reply_user, content, score, like_count, status, del_flag, create_by, create_time) '
          'VALUES (%d, %s, %d, 0, NULL, %s, %d, %d, %s, %s, %s, %s);'
          % (fid, q('food'), uid, q(text), score, like, q('0'), q('0'), q('seed15d'), q(ts(t))))
        comment_count += 1
        n_reply = rnd.choices([0, 1, 2, 3], weights=[3, 4, 2, 1])[0]
        if n_reply == 0:
            continue
        w('SET @p := LAST_INSERT_ID();')
        vals = []
        for _ in range(n_reply):
            ruid, runame = pick_user(uid)
            rtext = rnd.choice(FOOD_REPLY)
            rt = t + timedelta(minutes=rnd.randint(20, 60 * 6))
            if rt.hour < 9 or rt.hour > 22:
                rt = rt.replace(hour=rnd.randint(9, 21), minute=rnd.randint(0, 59))
            rt = min(rt, NOW)
            vals.append('(%d, %s, %d, @p, %s, %s, NULL, %d, %s, %s, %s, %s)'
                        % (fid, q('food'), ruid, q(uname), q(rtext), rnd.randint(0, 12), q('0'), q('0'), q('seed15d'), q(ts(rt))))
            comment_count += 1
        w('INSERT INTO pet_comment (pet_id, target_type, user_id, parent_id, reply_user, content, score, like_count, status, del_flag, create_by, create_time) VALUES '
          + ', '.join(vals) + ';')

# ---------- 3) 近 15 天订单 ----------
w('')
order_count = 0
item_count = 0
seq = 0
# 每天 4~7 单，集中在 10 月下旬到 11 月初
for day in range(DAYS):
    day_start = (NOW - timedelta(days=day)).replace(hour=9, minute=0, second=0, microsecond=0)
    for _ in range(rnd.randint(4, 7)):
        seq += 1
        uid, uname = (2, 'ry') if day in (2, 5, 8, 11, 13) or rnd.random() < 0.06 else rnd.choice(users)
        ct = day_start + timedelta(minutes=rnd.randint(0, 11 * 60 - 1), seconds=rnd.randint(0, 59))
        if ct > NOW:
            ct = NOW - timedelta(minutes=rnd.randint(5, 120))
        order_no = 'S15D%s%03d' % (ct.strftime('%Y%m%d'), seq % 1000)

        kind = rnd.choices(['food', 'pet', 'mixed'], weights=[5, 3, 2])[0]
        items = []
        if kind in ('food', 'mixed'):
            for _ in range(rnd.randint(1, 2)):
                g = rnd.choice(goods)
                qty = rnd.randint(1, 3)
                items.append(('1', None, g[0], g[1], g[4], g[3], g[2], qty))
        if kind in ('pet', 'mixed'):
            p = rnd.choice(pets)
            items.append(('2', p[0], None, p[1], p[3], '', p[2], 1))

        total = sum(round(it[6] * it[7], 2) for it in items)
        if uid == 2:
            u2 = U2_SEEN[0]
            U2_SEEN[0] += 1
            if u2 == 0:
                st = 'unpaid'
            elif u2 == 1:
                st = 'cancel'
            else:
                st = rnd.choices(['paid', 'done', 'cancel'], weights=[54, 33, 13])[0]  # 历史待支付会被超时任务自动取消，故不生成
        else:
            st = rnd.choices(['paid', 'done', 'cancel'], weights=[56, 35, 9])[0]
        fresh_unpaid = (st == 'unpaid' and uid == 2 and U2_SEEN[0] == 1)  # ry 的演示待支付单：用 NOW()-2min，导入后 30 分钟内可在收银台演示
        if st == 'cancel':
            status, pay_status, pay_method, pay_time, cancel_time = '3', '0', None, None, ct + timedelta(minutes=rnd.randint(5, 600))
            cancel_reason = rnd.choice(['临时有事，改天再约', '和家里商量后暂不购买', '拍错了，重新下单', '想换另一款，先取消这单'])
        elif st == 'unpaid':
            status, pay_status, pay_method, pay_time, cancel_time = '0', '0', None, None, None
            cancel_reason = None
        else:
            pay_method = rnd.choice(['alipay', 'wechat', 'balance'])
            pay_time = ct + timedelta(minutes=rnd.randint(1, 25))
            status = '1' if st == 'paid' else '0'
            pay_status = '1'
            cancel_time, cancel_reason = None, None

        order_type = '2' if kind == 'pet' else '1'
        receiver = rnd.choice(SURNAMES) + rnd.choice(['先生', '女士'])
        remark = rnd.choice(['', '', '到店自提', '请提前电话联系', '需要开票'])
        w('INSERT INTO pet_order (order_no, order_type, store_id, customer_id, user_id, user_name, item_count, total_amount, pay_amount, '
          'pay_status, pay_method, pay_time, status, delivery_type, receiver, receiver_phone, receiver_address, cancel_reason, cancel_time, '
          'remark, del_flag, create_by, create_time) VALUES (%s, %s, 1, %d, %d, %s, %d, %.2f, %.2f, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);'
          % (q(order_no), q(order_type), uid, uid, q(uname), len(items), total, total,
             q(pay_status), q(pay_method) if pay_method else 'NULL',
             ('date_sub(now(), interval 2 minute)' if fresh_unpaid else (q(ts(pay_time)) if pay_time else 'NULL')),
             q(status), q('1'), q(receiver), q(phone()),
             q(rnd.choice(STREETS)), q(cancel_reason) if cancel_reason else 'NULL',
             q(ts(cancel_time)) if cancel_time else 'NULL', q(remark), q('0'), q('seed15d'),
             ('date_sub(now(), interval 2 minute)' if fresh_unpaid else q(ts(ct)))))
        order_count += 1
        w('SET @o := LAST_INSERT_ID();')
        vals = []
        for it_type, pet_id, goods_id, gname_i, img, spec, price_i, qty in items:
            amount = round(price_i * qty, 2)
            ct_expr = 'date_sub(now(), interval 2 minute)' if fresh_unpaid else q(ts(ct))
            vals.append('(@o, %s, %s, %s, %s, NULL, %s, %s, %s, %.2f, %d, %.2f, %s)'
                        % (q(order_no), q(it_type),
                           pet_id if pet_id else 'NULL',
                           goods_id if goods_id else 'NULL',
                           q(gname_i), q(img), q(spec), price_i, qty, amount, ct_expr))
            item_count += 1
        w('INSERT INTO pet_order_item (order_id, order_no, item_type, pet_id, goods_id, sku_id, goods_name, goods_image, goods_spec, price, qty, amount, create_time) VALUES '
          + ', '.join(vals) + ';')

w('')
w('-- 合计：评论 %d 条（含回复），订单 %d 单 / 明细 %d 行' % (comment_count, order_count, item_count))

with io.open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print('written', OUT)
print('comments:', comment_count, 'orders:', order_count, 'items:', item_count)
print('window:', ts(START), '->', ts(NOW))
