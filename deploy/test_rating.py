#!/usr/bin/env python3
# 服务评价接口全链路自检（在服务器上运行，凭证不进命令行）
import json, time, urllib.request, urllib.error, subprocess

BASE = "http://127.0.0.1:8081"
USER = "admin"
PWD = "admin123"

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return {"http": e.code, "body": e.read().decode()[:120]}

# 1) 游客读汇总
print("[1 guest stat]", req("GET", "/pet/service/rating/stat"))

# 2) 登录
cap = req("GET", "/captchaImage")
uuid = cap["uuid"]
code = subprocess.run(["redis-cli", "GET", "captcha_codes:" + uuid],
                      capture_output=True, text=True).stdout.strip().strip('"')
login = req("POST", "/login", {"username": USER, "password": PWD, "code": code, "uuid": uuid})
tok = login.get("token")
print("[2 login]", "ok" if tok else login)

# 3) 打 4 星（纯评分）
print("[3 rate 4]", req("POST", "/pet/service/rating", {"score": 4, "content": ""}, tok))
# 4) 改 5 星 + 文字
print("[4 update 5 + text]", req("POST", "/pet/service/rating",
      {"score": 5, "content": "美容师很专业，狗狗洗完特别乖"}, tok))
# 5) 汇总与我的评价
print("[5 stat]", req("GET", "/pet/service/rating/stat", token=tok))
# 6) 游客评价列表
lst = req("GET", "/pet/comment/list?petId=0&targetType=service&pageNum=1&pageSize=5")
rows = lst.get("rows", [])
print("[6 list] total =", lst.get("total"),
      "; first =", (rows[0]["userName"], rows[0]["score"], rows[0]["content"][:30]) if rows else None)
# 7) 不污染宠物评论
pet = req("GET", "/pet/comment/stat?petId=1001&targetType=pet")
print("[7 pet stat untouched] avg =", pet.get("data", {}).get("avg"))
