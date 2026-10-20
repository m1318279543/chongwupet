#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""为每只宠物生成喜好种子数据（按科系套用模板），幂等写入 pet_preference。"""
import subprocess, os

MYSQL = r"C:/Program Files/MySQL/MySQL Server 8.0/bin/mysql.exe"
DB = "ry-pet"
USER = "root"
PASS = "123456"

# 科系 -> 模板
TEMPLATES = {
    "猫科": dict(food="猫粮、冻干、猫条", toy="逗猫棒、猫薄荷球、猫爬架",
                personality="独立又粘人，熟悉后很亲人", activity="中",
                env="有猫爬架与晒太阳位的安静角落",
                taboo="严禁巧克力、洋葱、百合（对猫剧毒）"),
    "犬科": dict(food="狗粮、磨牙棒、鸡肉干", toy="球、飞盘、绳结玩具",
                personality="忠诚活泼，喜欢陪伴与互动", activity="高",
                env="有活动空间、可日常遛弯的环境",
                taboo="严禁葡萄、巧克力、洋葱与尖锐骨"),
    "兔科": dict(food="提摩西草、兔粮、少量蔬菜", toy="啃咬木、隧道、草球",
                personality="胆小温顺，需时间建立信任", activity="中",
                env="宽敞干燥、通风良好的兔笼",
                taboo="忌水洗、忌高糖水果与生菜"),
    "鼠科": dict(food="鼠粮、瓜子、少许果蔬", toy="跑轮、磨牙石、躲避屋",
                personality="警觉灵动，夜行活跃", activity="高",
                env="安静避光、温度稳定的环境",
                taboo="忌喂生水与粘性食物（如面包）"),
    "鹦鹉科": dict(food="滋养丸、小米、新鲜果蔬", toy="铃铛、啃咬玩具、秋千",
                personality="聪明亲人，爱模仿与互动", activity="高",
                env="明亮通风、有栖木的鸟笼",
                taboo="忌牛油果、巧克力与厨房油烟"),
    "观赏鱼科": dict(food="颗粒饲料、冻红虫、蔬菜", toy="水草造景、沉木躲避",
                personality="群游活泼，领地意识因种而异", activity="高",
                env="水质稳定、溶氧充足的大水体",
                taboo="忌水温骤变与过量投喂"),
    "爬行科": dict(food="龟粮/鱼虾/昆虫（按种）", toy="晒背灯、躲避洞、攀爬石",
                personality="慢热安静，应激后易拒食", activity="低",
                env="温湿度适宜的饲养箱",
                taboo="忌低温与水生环境水质恶化"),
}

def mysql_query(sql):
    p = subprocess.run([MYSQL, "-u"+USER, "-p"+PASS, "--default-character-set=utf8mb4",
                       "-N", "-e", sql, DB], capture_output=True, text=True, encoding="utf-8")
    if p.returncode != 0:
        raise RuntimeError(p.stderr)
    rows = []
    for line in p.stdout.splitlines():
        line = line.strip()
        if line:
            rows.append(line.split("\t"))
    return rows

def run_sql_file(sql_text):
    path = os.path.join(os.path.dirname(__file__), "_pref_tmp.sql")
    with open(path, "w", encoding="utf-8") as f:
        f.write(sql_text)
    p = subprocess.run([MYSQL, "-u"+USER, "-p"+PASS, "--default-character-set=utf8mb4", DB],
                       stdin=open(path, "r", encoding="utf-8"), capture_output=True, text=True, encoding="utf-8")
    os.remove(path)
    if p.returncode != 0:
        raise RuntimeError(p.stderr)
    return p.stdout

def main():
    pets = mysql_query(
        "SELECT pi.pet_id, pi.pet_name, COALESCE(pc.family,'') "
        "FROM pet_info pi LEFT JOIN pet_category pc ON pc.category_id=pi.category_id "
        "ORDER BY pi.pet_id")
    print(f"共读到宠物 {len(pets)} 只")

    sqls = ["DELETE FROM pet_preference WHERE preference_id>0;"]
    for pid, pname, family in pets:
        t = TEMPLATES.get(family)
        if not t:
            t = dict(food="专用宠物粮", toy="适宜玩具", personality="温顺亲人",
                     activity="中", env="干净舒适的饲养环境", taboo="遵医嘱科学喂养")
        note = f"针对「{pname}」的个性化喜好，可由后台编辑完善"
        sqls.append(
            "INSERT INTO pet_preference(pet_id,food_like,toy_like,personality,activity_level,env_like,taboo,note,status,create_by,create_time) "
            f"VALUES({pid},'{t['food']}','{t['toy']}','{t['personality']}','{t['activity']}','{t['env']}','{t['taboo']}','{note}','0','admin',NOW());"
        )
    out = run_sql_file("\n".join(sqls))
    print("喜好种子写入完成。")
    print(out[:500])

if __name__ == "__main__":
    main()
