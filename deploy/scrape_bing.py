# -*- coding: utf-8 -*-
"""从 Bing 图片搜索爬真实宠物照片，替换重复图片（每张图全站唯一）"""
import json, io, re, os, time, random, urllib.request, urllib.parse, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG_DIR = os.path.join(ROOT, 'pet-web', 'public', 'images', 'pets')
DIST_DIR = os.path.join(ROOT, 'pet-web', 'dist-new', 'images', 'pets')
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept-Language': 'zh-CN,zh;q=0.9', 'Referer': 'https://cn.bing.com/'}
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

TASKS = [
    ('美国短毛猫 宠物猫',   '美国短毛猫',   'cat_18'),
    ('异国短毛猫 加菲猫',   '异国短毛猫',   'cat_19'),
    ('暹罗猫 宠物猫',       '暹罗猫',       'cat_20'),
    ('苏格兰折耳猫 宠物猫', '苏格兰折耳猫', 'cat_21'),
    ('金毛寻回犬 幼犬',     '金毛',         'dog_16'),
    ('哈士奇 西伯利亚雪橇犬','蓝眼哈士奇',  'dog_17'),
    ('博美犬 宠物狗',       '博美犬',       'dog_18'),
    ('拉布拉多寻回犬',      '拉布拉多猎犬', 'dog_19'),
    ('泰迪犬 贵宾犬',       '泰迪犬',       'dog_20'),
    ('柯基犬 威尔士柯基',   '柯基犬',       'dog_21'),
    ('金鱼 观赏鱼',         '金鱼',         'aquarium_16'),
    ('孔雀鱼 观赏鱼',       '孔雀鱼',       'aquarium_17'),
    ('虎皮鹦鹉 宠物鸟',     '虎皮鹦鹉',     'smallpet_16'),
    ('三线仓鼠 宠物仓鼠',   '银狐三线仓鼠', 'smallpet_17'),
    ('垂耳兔 宠物兔',       '垂耳兔',       'smallpet_18'),
    ('安哥拉兔 长毛兔',     '长毛安哥拉兔', 'smallpet_19'),
]

def fetch(url, timeout=20, referer=None):
    h = dict(UA)
    if referer:
        h['Referer'] = referer
    return opener.open(urllib.request.Request(url, headers=h), timeout=timeout).read()

def bing_murls(query, count=12):
    q = urllib.parse.quote(query)
    url = 'https://cn.bing.com/images/search?q=%s&form=HDRSC2&first=1' % q
    html = fetch(url).decode('utf8', 'ignore')
    urls = re.findall(r'murl&quot;:&quot;(.*?)&quot;', html)
    out = []
    for u in urls[:count]:
        u = u.replace('\\u002f', '/').replace('\\/', '/')
        out.append(u)
    return out

def load_sigs():
    sigs = []
    for d in (IMG_DIR,):
        for fn in os.listdir(d):
            if fn.endswith('.jpg'):
                try:
                    im = Image.open(os.path.join(d, fn)).convert('RGB').resize((16, 16), Image.LANCZOS)
                    sigs.append(list(im.getdata()))
                except Exception:
                    pass
    return sigs

SIGS = []
def similar(im):
    s = list(im.convert('RGB').resize((16, 16), Image.LANCZOS).getdata())
    for t in SIGS:
        diff = sum(abs(a[0]-b[0])+abs(a[1]-b[1])+abs(a[2]-b[2]) for a, b in zip(s, t))
        if diff < 2200:
            return True
    return False

def try_save(data, path):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    w, h = im.size
    if w < 400 or h < 300:
        return None
    if similar(im):
        return None
    # 居中裁成 4:3，统一 640 宽
    target = 4 / 3
    if w / h > target:
        nw = int(h * target); im = im.crop(((w - nw)//2, 0, (w + nw)//2, h))
    else:
        nh = int(w / target); im = im.crop((0, (h - nh)//2, w, (h + nh)//2))
    im = im.resize((640, 480), Image.LANCZOS)
    im.save(path, 'JPEG', quality=84, optimize=True)
    return im.size

def main():
    global SIGS
    SIGS = load_sigs()
    updates, failed = [], []
    for query, pet_name, fname in TASKS:
        done = None
        try:
            murls = bing_murls(query)
        except Exception as e:
            murls = []
            print('SEARCH-FAIL', query, str(e)[:60])
        for u in murls:
            if done:
                break
            try:
                data = fetch(u, referer='https://cn.bing.com/')
                if len(data) < 8000:
                    continue
                size = try_save(data, os.path.join(IMG_DIR, fname + '.jpg'))
                if size:
                    done = size
            except Exception:
                continue
        if done:
            SIGS.append(list(Image.open(os.path.join(IMG_DIR, fname + '.jpg')).convert('RGB').resize((16, 16), Image.LANCZOS).getdata()))
            updates.append((pet_name, '/images/pets/%s.jpg' % fname))
            print('OK  %-13s %-12s %sx%s' % (fname, pet_name, *done))
            time.sleep(1.2 + random.random())
        else:
            failed.append(query)
            print('FAIL', fname, pet_name)

    import shutil
    for _, img in updates:
        src = os.path.join(IMG_DIR, os.path.basename(img))
        if os.path.exists(DIST_DIR):
            shutil.copy2(src, os.path.join(DIST_DIR, os.path.basename(img)))

    with io.open(os.path.join(ROOT, 'sql', 'pet_image_dedup.sql'), 'a', encoding='utf8') as fp:
        for pet_name, img in updates:
            fp.write("UPDATE pet_info SET image='%s' WHERE pet_name='%s';\n" % (img, pet_name))
    print('---- ok=%d fail=%d ----' % (len(updates), len(failed)))
    for f in failed:
        print('  FAILED:', f)

if __name__ == '__main__':
    main()
