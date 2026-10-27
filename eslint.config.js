// ESLint 9 扁平配置（基础规则集）
const js = require('@eslint/js');

const browserGlobals = {
  window: 'readonly', document: 'readonly', location: 'readonly',
  sessionStorage: 'readonly', fetch: 'readonly', alert: 'readonly',
  confirm: 'readonly', URLSearchParams: 'readonly', URL: 'readonly', console: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly'
};

// public/js 为多 <script> 共享作用域，common.js 提供以下跨文件全局能力
const sharedFrontendGlobals = {
  API: 'readonly',
  rawRequest: 'readonly',
  safeAlert: 'readonly',
  escapeHtml: 'readonly',
  getAuth: 'readonly',
  setAuth: 'readonly',
  clearAuth: 'readonly',
  redirectToLogin: 'readonly',
  showCourseDetail: 'readonly',
  setupCourseTableDelegation: 'readonly',
  setupModalClose: 'readonly',
  setupLogout: 'readonly',
  renderPagination: 'readonly'
};

module.exports = [
  js.configs.recommended,
  {
    ignores: ['node_modules/**', 'data/**']
  },
  {
    // Node 侧：服务端 / 脚本 / 测试 / 配置
    files: ['server.js', 'lib/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        process: 'readonly', console: 'readonly', __dirname: 'readonly',
        Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        fetch: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart']
    }
  },
  {
    // 浏览器侧：common.js 定义共享函数，使用浏览器内建全局
    files: ['public/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^e$|^err$', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart']
    }
  },
  {
    // common.js 中的跨文件共享函数（供其他 <script> 使用，非本文件内引用）
    files: ['public/js/common.js'],
    rules: {
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^(setAuth|setupCourseTableDelegation|renderPagination|setupModalClose|setupLogout)$',
        caughtErrors: 'none'
      }]
    }
  },
  {
    // 其余前端脚本引用 common.js 提供的跨文件全局
    files: ['public/js/**/*.js'],
    ignores: ['public/js/common.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...browserGlobals, ...sharedFrontendGlobals }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^e$|^err$', caughtErrors: 'none' }],
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart']
    }
  }
];
