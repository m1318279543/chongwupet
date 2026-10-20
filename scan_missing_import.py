#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 .vue 文件，找出「使用/调用了但既没有 import 也没有声明」的标识符。

pet-web / ruoyi-ui 都没有 unplugin-auto-import，任何漏导入、漏声明都会在运行时
抛 ReferenceError —— 轻则白屏，重则像「取消预约」那样被 .catch(() => {}) 静默吞掉，
用户只看到"点了没反应"，控制台却干干净净。

本脚本覆盖三类问题（2026-10-15 升级，此前只查 Vue API 白名单，漏掉了后两类）：
  A. Vue/路由/Pinia 组合式 API 使用了但未从对应包导入（原有能力）
  B. 脚本里调用了某函数，但它没有 import、也没有声明（如 cancelPetAppointment）
  C. 模板里引用了某标识符，但脚本里没有声明（如 cancelingId）

用法:
  python scan_missing_import.py [src_dir ...]
不带参数时扫描脚本同级目录下的 pet-web/src 与 ruoyi-ui/src
"""
import os
import re
import sys

NEED_FROM = {
    'vue': {
        'ref', 'reactive', 'computed', 'watch', 'watchEffect', 'watchPostEffect',
        'onMounted', 'onBeforeMount', 'onBeforeUnmount', 'onUnmounted', 'onUpdated',
        'onBeforeUpdate', 'onActivated', 'onDeactivated', 'nextTick', 'inject', 'provide',
        'toRef', 'toRefs', 'isRef', 'unref', 'shallowRef', 'shallowReactive', 'markRaw',
        'readonly', 'isProxy', 'isReactive', 'isReadonly', 'customRef', 'triggerRef',
        'defineAsyncComponent', 'getCurrentInstance', 'h', 'useSlots', 'useAttrs',
        'useCssModule', 'effectScope', 'onScopeDispose', 'toRaw', 'toValue',
    },
    'vue-router': {'useRoute', 'useRouter', 'useLink', 'onBeforeRouteLeave', 'onBeforeRouteUpdate'},
    'pinia': {'defineStore', 'storeToRefs', 'acceptHMRUpdate'},
}

IMPORT_RE = re.compile(r"import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s+['\"]([^'\"]+)['\"]")
IDENT_RE = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")
STR_COMMENT_RE = re.compile(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`|//[^\n]*|/\*.*?\*/", re.S)

JS_GLOBAL = {
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
    'return', 'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof',
    'in', 'of', 'void', 'yield', 'await', 'async', 'function', 'class', 'extends', 'super',
    'this', 'import', 'export', 'from', 'as', 'let', 'const', 'var', 'true', 'false', 'null',
    'undefined', 'console', 'JSON', 'Math', 'Date', 'Promise', 'Array', 'Object', 'String',
    'Number', 'Boolean', 'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'RegExp', 'Error',
    'TypeError', 'RangeError', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'setTimeout',
    'setInterval', 'clearTimeout', 'clearInterval', 'encodeURIComponent', 'decodeURIComponent',
    'Intl', 'Reflect', 'Proxy', 'fetch', 'alert', 'confirm', 'requestAnimationFrame',
    'structuredClone', 'queueMicrotask', 'globalThis', 'window', 'document', 'location',
    'navigator', 'localStorage', 'sessionStorage', 'Float32Array', 'Uint8Array', 'ArrayBuffer',
    'get', 'set', 'valueOf', 'toString',
    # 浏览器内置
    'Blob', 'FileReader', 'FormData', 'URL', 'URLSearchParams', 'TextDecoder', 'TextEncoder',
    'Event', 'CustomEvent', 'Image', 'Audio', 'Worker', 'XMLHttpRequest', 'AbortController',
    'Headers', 'Request', 'Response', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
    'requestIdleCallback', 'cancelAnimationFrame', 'atob', 'btoa', 'open', 'close', 'print',
}
VUE_MACRO = {
    'defineProps', 'defineEmits', 'defineExpose', 'withDefaults', 'defineOptions',
    'defineModel', 'defineSlots', 'defineComponent', 'useSlots', 'useAttrs',
}
# 模板里常用的内置（不是 script 变量）
TPL_BUILTIN = {
    'true', 'false', 'null', 'undefined', 'typeof', 'in', 'instanceof', 'new',
    'Math', 'JSON', 'Date', 'String', 'Number', 'Boolean', 'Array', 'Object', 'console',
    'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent',
    '$event', '$slots', '$attrs', '$props', '$emit', '$refs', '$set', '$t', 'item', 'index',
    # 这些是组件属性名/slot 变量，常出现在表达式里但不是 script 变量
    'width', 'height', 'label', 'prop', 'scope', 'row', 'column', 'value', 'type', 'size',
    'name', 'key', 'src', 'href', 'title', 'target', 'path', 'text', 'icon', 'color',
    'content', 'options', 'data', 'maxlength', 'align', 'fixed', 'sortable', 'format',
    'placeholder', 'clearable', 'disabled', 'multiple', 'filterable', 'remote', 'loading',
    'node', 'child', 'children', 'parent', 'res', 'file', 'files', 'query', 'params',
    # RuoYi 挂在 app.config.globalProperties 上的全局属性，模板可直接用
    'parseTime', '$router', '$route', '$store', '$modal', '$tab', '$auth', '$download',
    '$cache', '$dict', 'handleTree', 'selectDictLabel', 'addDateRange', 'resetForm',
    'getDicts', 'dict', 'dicts', 'download',
}

SCRIPT_RE = re.compile(r'<script[^>]*setup[^>]*>(.*?)</script>', re.S | re.I)
TEMPLATE_RE = re.compile(r'<template>(.*?)</template>', re.S | re.I)


def collect_defined(script):
    """收集脚本里被定义/导入的标识符"""
    # 去掉字符串和注释，避免误抓
    clean = STR_COMMENT_RE.sub(' ', script)
    known = set()

    # import {A, B as C} from '...'
    for m in re.finditer(r'import\s*\{([^}]*)\}\s*from', clean):
        for piece in m.group(1).split(','):
            piece = piece.strip()
            if not piece:
                continue
            name = piece.split(' as ')[-1].strip() if ' as ' in piece else piece
            if IDENT_RE.fullmatch(name):
                known.add(name)
    # import X from / import * as X
    for m in re.finditer(r'import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)', clean):
        known.add(m.group(1))
    for m in re.finditer(r'import\s*\*\s*as\s+([A-Za-z_$][\w$]*)', clean):
        known.add(m.group(1))

    # 声明: const/let/var/function/class
    known |= set(re.findall(r'\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)', clean))

    # defineProps 声明的属性名（模板里可直接使用）
    for m in re.finditer(r'defineProps\s*\(', clean):
        i = m.end()
        depth = 1
        start = i
        while i < len(clean) and depth > 0:
            if clean[i] in '([{':
                depth += 1
            elif clean[i] in ')]}':
                depth -= 1
            i += 1
        body = clean[start:i - 1]
        arr = re.match(r'\s*\[(.*)\]', body, re.S)
        if arr:
            for piece in arr.group(1).split(','):
                name = piece.strip().strip('"\'')
                if IDENT_RE.fullmatch(name):
                    known.add(name)
        else:
            obj = re.match(r'\s*\{(.*)\}\s*$', body, re.S)
            if obj:
                inner = obj.group(1)
                depth2, buf, parts = 0, '', []
                for ch in inner:
                    if ch in '{[(':
                        depth2 += 1
                    elif ch in '}])':
                        depth2 -= 1
                    if ch == ',' and depth2 == 0:
                        parts.append(buf)
                        buf = ''
                    else:
                        buf += ch
                parts.append(buf)
                for p in parts:
                    name = p.split(':')[0].strip().strip('"\'')
                    if IDENT_RE.fullmatch(name):
                        known.add(name)

    # 解构: const { a, b: c } = / const [x, y] =
    for m in re.finditer(r'\b(?:const|let|var)\s*[\{\[]([^\}\]]*)[\}\]]\s*=', clean):
        for piece in re.split(r'[,:]', m.group(1)):
            name = piece.strip().split('=')[0].strip()
            if IDENT_RE.fullmatch(name):
                known.add(name)

    # 箭头函数参数: (a, b) => / ({ a, b }) => / a =>
    for m in re.finditer(r'\(([^()]*)\)\s*=>', clean):
        for piece in re.split(r'[,:]', m.group(1).strip().strip('{}[]')):
            name = piece.strip().split('=')[0].strip().lstrip('...')
            if IDENT_RE.fullmatch(name):
                known.add(name)
    for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*=>', clean):
        known.add(m.group(1))
    # function f(a, b)
    for m in re.finditer(r'function\s*[A-Za-z_$\w]*\s*\(([^)]*)\)', clean):
        for piece in m.group(1).split(','):
            name = piece.strip().split('=')[0].strip().lstrip('...')
            if IDENT_RE.fullmatch(name):
                known.add(name)
    # catch (e) / for (const x of y)
    known |= set(re.findall(r'catch\s*\(\s*([A-Za-z_$][\w$]*)', clean))
    known |= set(re.findall(r'for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)', clean))

    return known


def check_script_calls(script, known):
    """B: 脚本里被调用但未定义的标识符（含 ElMessageBox.prompt 这类成员调用的根对象）"""
    clean = STR_COMMENT_RE.sub(' ', script)
    # 排除前面带 . 的（方法调用）、排除关键字
    called = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(', clean))
    # 成员调用的根对象，只取首字母大写的（外部导入的模块/类，如 ElMessageBox / Cookies / dayjs）
    # 小写的多为局部对象（res、item、props），不检查以免误报
    roots = set(re.findall(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\.', clean))
    caps = {r for r in roots if r[:1].isupper()}
    bad = (called | caps) - known - JS_GLOBAL - VUE_MACRO
    return sorted(bad)


def check_template_refs(tpl, known):
    """C: 模板里引用了但脚本未声明的标识符"""
    # 收集 v-for 引入的局部变量
    local = set()
    for m in re.finditer(r'v-for\s*=\s*"\(?([^)"]*)\)?\s+in\s+', tpl):
        for piece in m.group(1).split(','):
            name = piece.strip()
            if IDENT_RE.fullmatch(name):
                local.add(name)
    # v-slot / #xxx 引入的 slot 变量
    for m in re.finditer(r'(?:v-slot(?::[\w-]+)?|#[\w-]+)\s*=\s*"\{?([^}"]*)\}?"', tpl):
        for piece in m.group(1).split(','):
            name = piece.strip().split(':')[-1].strip()
            if IDENT_RE.fullmatch(name):
                local.add(name)
    # 模板内联箭头函数的参数，如 @change="(v) => ..." / s => ...
    for m in re.finditer(r'\(([^()]*)\)\s*=>', tpl):
        for piece in m.group(1).split(','):
            name = piece.strip().split('=')[0].strip().lstrip('...')
            if IDENT_RE.fullmatch(name):
                local.add(name)
    for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*=>', tpl):
        local.add(m.group(1))
    # 只取表达式片段：{{ }}、v-xxx="..."、:xxx="..."、@xxx="..."
    exprs = re.findall(r'\{\{(.*?)\}\}', tpl, re.S)
    exprs += re.findall(r'(?:v-[\w:.-]+|:[\w.-]+|@[\w.-]+)="([^"]*)"', tpl, re.S)
    idents = set()
    for e in exprs:
        clean = STR_COMMENT_RE.sub(' ', e)
        # 去掉对象字面量的键 (key: value 中的 key)
        clean = re.sub(r'([A-Za-z_$][\w$]*)\s*:', ' ', clean)
        # 去掉属性/索引访问的后半段 (a.b.c → 只保留 a)
        for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)', clean):
            idents.add(m.group(1))
    bad = sorted(i for i in idents - known - local - JS_GLOBAL - TPL_BUILTIN
                 if not i.startswith('el-') and not i.endswith('-'))
    return bad


def scan_file(path, skip_vue_api=False):
    with open(path, encoding='utf-8') as f:
        src = f.read()

    im = SCRIPT_RE.search(src)
    if not im:
        return []
    script = im.group(1)
    tm = TEMPLATE_RE.search(src)
    tpl = tm.group(1) if tm else ''

    problems = []
    known = collect_defined(script)
    if skip_vue_api:
        # 该项目有 unplugin-auto-import，Vue 组合式 API 会自动注入，无需显式导入
        for apis in NEED_FROM.values():
            known |= apis
        known |= {'defineProps', 'defineEmits', 'withDefaults', 'defineExpose', 'defineOptions'}
        # RuoYi 通过 auto-import 的 dirs / globalProperties 提供的工具函数与 Element Plus API
        known |= {'useDict', 'selectDictLabel', 'addDateRange', 'handleTree', 'parseTime',
                  'download', 'resetForm', 'getDicts', 'resolveComponent', 'label',
                  'ElMessage', 'ElMessageBox', 'ElNotification', 'ElLoading'}

    # A. Vue API 白名单（仅对没有 auto-import 的项目开启）
    if not skip_vue_api:
        imported = {mod: set() for mod in NEED_FROM}
        for m in IMPORT_RE.finditer(src):
            default, named, mod = m.group(1), m.group(2), m.group(3)
            if mod in imported and named:
                for piece in named.split(','):
                    piece = piece.strip()
                    if not piece:
                        continue
                    if ' as ' in piece:
                        piece = piece.split(' as ')[0].strip()
                    imported[mod].add(piece)
            if mod in imported and default:
                imported[mod].add(default)
        # 只在脚本与模板里找 Vue API，不扫 <style>（CSS 类名如 .h-4 会误伤）
        clean_all = STR_COMMENT_RE.sub(' ', script + '\n' + tpl)
        idents_all = set(IDENT_RE.findall(clean_all))
        for mod, apis in NEED_FROM.items():
            for api in apis:
                # 本地已声明同名变量（如 let h = 0）不算漏导入
                if api in idents_all and api not in imported.get(mod, set()) and api not in known:
                    problems.append((api, f'未从 "{mod}" 导入'))

    # B. 脚本内未定义的函数调用
    for name in check_script_calls(script, known):
        problems.append((name, '脚本中调用了但未导入/未声明'))

    # C. 模板中未声明的引用（ruoyi-ui 有 auto-import 的 Element Plus 组件/图标，跳过以免误报）
    if not skip_vue_api:
        for name in check_template_refs(tpl, known):
            problems.append((name, '模板中引用了但脚本未声明'))

    # 去重（同名可能同时命中 A/B/C）
    seen = set()
    out = []
    for name, why in problems:
        if name in seen:
            continue
        seen.add(name)
        out.append((name, why))
    return out


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    here = os.path.dirname(os.path.abspath(__file__))
    explicit = [a for a in sys.argv[1:] if not a.startswith('--')]
    all_mode = '--all' in sys.argv
    if explicit:
        targets = [(d, False) for d in explicit]
    else:
        # pet-web 没有 auto-import，必须显式 import —— 全量检查
        targets = [(os.path.join(here, 'pet-web', 'src'), False)]
        if all_mode:
            # ruoyi-ui 自带 unplugin-auto-import，跳过"Vue API 未导入"检查以免全是误报
            targets.append((os.path.join(here, 'ruoyi-ui', 'src'), True))

    total = 0
    hits = 0
    for d, skip_vue_api in targets:
        if not os.path.isdir(d):
            print(f'(跳过不存在的目录: {d})')
            continue
        print(f'== 扫描 {d}' + ('（跳过 Vue API 检查：该项目有 auto-import）' if skip_vue_api else ''))
        for root, _, files in os.walk(d):
            for fn in files:
                if not fn.endswith('.vue'):
                    continue
                total += 1
                fp = os.path.join(root, fn)
                probs = scan_file(fp, skip_vue_api=skip_vue_api)
                if probs:
                    hits += 1
                    rel = os.path.relpath(fp, d)
                    print(f'[!] {rel}')
                    for name, why in probs:
                        print(f'      {name} —— {why}')
    print(f'\n扫描 {total} 个 .vue 文件，{hits} 个存在疑似问题。')


if __name__ == '__main__':
    main()
