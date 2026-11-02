# -*- coding: utf-8 -*-
"""验证自助注册全链路：注册 -> 默认角色 -> 登录 -> 调用需登录接口"""
import json, subprocess, urllib.request

BASE = 'http://47.116.73.25/dev-api'
SSH = r'D:/Undergraduate_courses/qiyekaifa/chongwupet/deploy/ssh_run.py'
USER = 'testuser01'
PWD = 'test' + '123456'


def http(path, data=None, token=None, method=None):
    req = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data is not None else None,
                                 method=method or ('POST' if data is not None else 'GET'))
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())


def captcha():
    d = http('/captchaImage')
    uuid = d['uuid']
    out = subprocess.run(['python', SSH, 'redis-cli GET captcha_codes:%s | tr -d \'"\'' % uuid],
                         capture_output=True, text=True).stdout.strip().strip('"')
    return uuid, out


# 1. 注册
u1, c1 = captcha()
r = http('/register', {'username': USER, 'password': PWD, 'code': c1, 'uuid': u1})
print('1. 注册:', r.get('code'), r.get('msg'))

# 2. 登录
u2, c2 = captcha()
r = http('/login', {'username': USER, 'password': PWD, 'code': c2, 'uuid': u2})
token = r.get('token') or ''
print('2. 登录:', r.get('code'), 'token_len=%d' % len(token))

# 3. getInfo 看角色
r = http('/getInfo', token=token)
roles = (r.get('roles') or [])
print('3. 角色:', roles, '| 昵称:', (r.get('user') or {}).get('nickName'))

# 4. 需登录接口
r = http('/pet/wallet/mine', token=token)
print('4. 钱包接口:', r.get('code'), 'balance=', (r.get('data') or {}).get('balance') if isinstance(r.get('data'), dict) else r.get('data'))
