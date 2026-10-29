import request from '@/utils/request'

// AI 知识库列表
export function listKnowledge(query) {
  return request({
    url: '/pet/knowledge/list',
    method: 'get',
    params: query
  })
}

// 知识详情
export function getKnowledge(knowledgeId) {
  return request({
    url: '/pet/knowledge/' + knowledgeId,
    method: 'get'
  })
}

// 新增知识
export function addKnowledge(data) {
  return request({
    url: '/pet/knowledge',
    method: 'post',
    data
  })
}

// 修改知识
export function updateKnowledge(data) {
  return request({
    url: '/pet/knowledge',
    method: 'put',
    data
  })
}

// 删除知识
export function delKnowledge(knowledgeIds) {
  return request({
    url: '/pet/knowledge/' + knowledgeIds,
    method: 'delete'
  })
}

// 运营概览：总量、分布、命中排行、知识缺口、反馈
export function knowledgeStat() {
  return request({
    url: '/pet/knowledge/stat',
    method: 'get'
  })
}
