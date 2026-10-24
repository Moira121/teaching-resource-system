/**
 * 接口入参校验工具：所有错误返回统一 { code:400, message }，
 * 校验通过后的值经白名单/长度约束，配合参数化 SQL 杜绝注入。
 */

const ID_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;
const RESOURCE_TYPES = ['课件', '文档', '视频', '链接', '作业'];
const URL_PATTERN = /^(https?:\/\/[^\s]{1,490}|\/[\w\-./]{1,490})$/i;

function isString(v) {
  return typeof v === 'string';
}

/** 路径类 ID 校验（课程/教师/资源主键） */
function validId(id) {
  return isString(id) && ID_PATTERN.test(id);
}

/** 列表筛选参数校验，返回错误消息或 null */
function validateListQuery(q) {
  const strFields = ['keyword', 'semester', 'college', 'department', 'category', 'teacherId'];
  for (const f of strFields) {
    if (q[f] !== undefined && q[f] !== '' && !isString(q[f])) return `${f} 参数格式错误`;
  }
  if (q.keyword && q.keyword.length > 100) return '关键词长度不能超过 100';
  for (const f of ['semester', 'college', 'department', 'category']) {
    if (q[f] && q[f].length > 50) return `${f} 参数过长`;
  }
  if (q.teacherId && !validId(q.teacherId)) return 'teacherId 参数格式错误';
  return null;
}

/** 教学资源写入体校验，返回 { value, error } */
function validateResourceBody(body) {
  if (!body || typeof body !== 'object') return { error: '请求体格式错误' };
  const name = isString(body.name) ? body.name.trim() : '';
  const type = isString(body.type) ? body.type.trim() : '';
  const url = isString(body.url) ? body.url.trim() : '';
  const description = isString(body.description) ? body.description.trim() : '';

  if (!name || name.length > 100) return { error: '资源名称必填且不能超过 100 字' };
  if (!RESOURCE_TYPES.includes(type)) return { error: '资源类型非法' };
  if (!url || !URL_PATTERN.test(url)) return { error: '资源链接必须为 http/https 合法地址' };
  if (description.length > 500) return { error: '资源描述不能超过 500 字' };

  return { value: { name, type, url, description } };
}

const EVALUATOR_ROLES = ['学生', '督导', '同行'];

/** 评价查询/导出参数校验（Sprint3），返回错误消息或 null */
function validateEvaluationQuery(q) {
  if (!q || typeof q !== 'object') return '查询参数格式错误';
  for (const f of ['courseId', 'teacherId', 'semester', 'college', 'evaluatorRole']) {
    if (q[f] !== undefined && q[f] !== '' && !isString(q[f])) return `${f} 参数格式错误`;
  }
  if (q.courseId && !validId(q.courseId)) return 'courseId 参数格式错误';
  if (q.teacherId && !validId(q.teacherId)) return 'teacherId 参数格式错误';
  if (q.semester && (q.semester.length > 50 || !/^\d{4}-\d{4}-[12]$/.test(q.semester))) return 'semester 参数格式错误（示例 2025-2026-1）';
  if (q.college && q.college.length > 50) return 'college 参数过长';
  if (q.evaluatorRole && !EVALUATOR_ROLES.includes(q.evaluatorRole)) return 'evaluatorRole 参数非法（学生/督导/同行）';
  return null;
}

module.exports = { validId, validateListQuery, validateResourceBody, validateEvaluationQuery, RESOURCE_TYPES, EVALUATOR_ROLES };
