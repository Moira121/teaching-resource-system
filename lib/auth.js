/**
 * 轻量鉴权模块（Sprint2）：
 * - POST /api/auth/login 登录后下发 HMAC-SHA256 签名 token（不引入额外依赖）
 * - requireAuth 校验 Authorization: Bearer <token>
 * - requireRole 做角色级权限控制
 * 说明：Sprint2 为教学内网演示系统，token 密钥来自环境变量 AUTH_SECRET，
 * 未配置时使用进程随机密钥（重启即失效，需重新登录）。
 */
const crypto = require('crypto');

const SECRET = process.env.AUTH_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const ROLES = ['director', 'teacher', 'supervisor'];

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
}

/** 签发 token：payload 含 role / teacherId / exp */
function issueToken(user) {
  const payload = {
    role: user.role,
    teacherId: user.teacherId || null,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** 校验 token，失败抛 Error，成功返回负载对象 */
function verifyToken(token) {
  if (typeof token !== 'string' || token.indexOf('.') === -1) {
    throw new Error('令牌格式非法');
  }
  const [payloadB64, sig] = token.split('.');
  const expected = sign(payloadB64);
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('令牌签名无效');
  }
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) throw new Error('登录已过期');
  if (!ROLES.includes(payload.role)) throw new Error('角色非法');
  return payload;
}

/** 解析 Bearer token 并挂到 req.auth */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
  try {
    req.auth = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
  }
}

/** 角色白名单：requireRole('director','supervisor') */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ code: 403, message: '无权执行该操作' });
    }
    next();
  };
}

module.exports = { ROLES, issueToken, verifyToken, requireAuth, requireRole };
