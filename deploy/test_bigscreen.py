#!/usr/bin/env python3
# 大屏接口自检（在服务器上运行，凭证不进命令行）
import json, urllib.request, urllib.error, subprocess

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

cap = req("GET", "/captchaImage")
uuid = cap["uuid"]
code = subprocess.run(["redis-cli", "GET", "captcha_codes:" + uuid],
                      capture_output=True, text=True).stdout.strip().strip('"')
login = req("POST", "/login", {"username": USER, "password": PWD, "code": code, "uuid": uuid})
tok = login.get("token")
print("[login]", "ok" if tok else login)

for days in (7, 30):
    d = req("GET", f"/pet/dashboard/bigscreen?days={days}", token=tok)
    data = d.get("data") or {}
    print(f"[days={days}] code={d.get('code')}")
    print("  kpi:", json.dumps(data.get("kpi"), ensure_ascii=False))
    print("  userTrend pts:", len(data.get("userTrend") or []))
    print("  funnel:", json.dumps(data.get("funnel"), ensure_ascii=False))
    print("  rating:", json.dumps(data.get("rating"), ensure_ascii=False))
    print("  serviceMode:", json.dumps(data.get("serviceMode"), ensure_ascii=False))
    print("  wallet:", json.dumps(data.get("wallet"), ensure_ascii=False))
    sc = data.get("storeCompare") or []
    print("  storeCompare top3:", [(s.get("name"), s.get("revenue")) for s in sc[:3]])
    lc = data.get("latestComments") or []
    print("  latestComments n:", len(lc), "first:", json.dumps(lc[0], ensure_ascii=False)[:120] if lc else None)
    rk = (data.get("ranking") or {}).get("services") or []
    print("  ranking.services:", json.dumps(rk[:3], ensure_ascii=False))

# 无权限普通用户应被拒（code=403 body via RuoYi 200+code403 规则）
cap = req("GET", "/captchaImage"); uuid = cap["uuid"]
code = subprocess.run(["redis-cli", "GET", "captcha_codes:" + uuid],
                      capture_output=True, text=True).stdout.strip().strip('"')
login2 = req("POST", "/login", {"username": "ry", "password": PWD, "code": code, "uuid": uuid})
tok2 = login2.get("token")
if tok2:
    d2 = req("GET", "/pet/dashboard/bigscreen?days=7", token=tok2)
    print("[ry perm]", d2.get("code"))
else:
    print("[ry login]", "failed/expected")
