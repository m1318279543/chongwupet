-- 为新增的三个后台模块补 sys_menu 菜单与按钮权限
-- 模块：宠物喜好 / 健康百科 / 客服管理
-- 父菜单：宠物管理(menu_id=2000)，沿用既有菜单编号区间 2040-2053
-- 可重复执行（先按 menu_id 区间清理再插入）

DELETE FROM sys_menu WHERE menu_id BETWEEN 2040 AND 2053;

INSERT INTO sys_menu
  (menu_id, menu_name, parent_id, order_num, path, component, query, is_frame, is_cache, menu_type, visible, status, perms, icon, create_by, create_time, remark)
VALUES
  -- ===== 宠物喜好 =====
  (2040, '宠物喜好', 2000, 9,  'preference', 'pet/preference/index', '', 1, 0, 'C', '0', '0', 'pet:preference:list',   'star',          'admin', sysdate(), '宠物喜好管理菜单'),
  (2041, '喜好查询', 2040, 1,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:preference:query',  '#',             'admin', sysdate(), ''),
  (2042, '喜好新增', 2040, 2,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:preference:add',    '#',             'admin', sysdate(), ''),
  (2043, '喜好修改', 2040, 3,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:preference:edit',   '#',             'admin', sysdate(), ''),
  (2044, '喜好删除', 2040, 4,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:preference:remove', '#',             'admin', sysdate(), ''),

  -- ===== 健康百科（宠物常见疑难杂症知识库）=====
  (2045, '健康百科', 2000, 10, 'issue',      'pet/issue/index',      '', 1, 0, 'C', '0', '0', 'pet:issue:list',        'documentation', 'admin', sysdate(), '宠物健康问题知识库菜单'),
  (2046, '百科查询', 2045, 1,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:issue:query',       '#',             'admin', sysdate(), ''),
  (2047, '百科新增', 2045, 2,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:issue:add',         '#',             'admin', sysdate(), ''),
  (2048, '百科修改', 2045, 3,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:issue:edit',        '#',             'admin', sysdate(), ''),
  (2049, '百科删除', 2045, 4,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:issue:remove',      '#',             'admin', sysdate(), ''),

  -- ===== 客服管理（用户咨询 + 后台回复）=====
  (2050, '客服管理', 2000, 11, 'consult',    'pet/consult/index',    '', 1, 0, 'C', '0', '0', 'pet:consult:list',      'message',       'admin', sysdate(), '客服咨询管理菜单'),
  (2051, '咨询查询', 2050, 1,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:consult:query',     '#',             'admin', sysdate(), ''),
  (2052, '咨询回复', 2050, 2,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:consult:edit',      '#',             'admin', sysdate(), ''),
  (2053, '咨询删除', 2050, 3,  '#',          '',                     '', 1, 0, 'F', '0', '0', 'pet:consult:remove',    '#',             'admin', sysdate(), '');
