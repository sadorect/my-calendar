import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        indexedDB: 'readonly',
        Notification: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        FileReader: 'readonly',
        // Node.js globals
        process: 'readonly'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      // `const { id, ...rest } = obj` is the idiomatic way to omit a key. Without
      // this, every such line is reported as an unused variable.
      'no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }]
    }
  },
  {
    // Test files run under Vitest/Playwright, not the browser.
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { global: 'readonly', globalThis: 'readonly' }
    }
  },
  {
    ignores: ['dist', 'node_modules', '.eslintrc.cjs', 'playwright-report', 'test-results']
  }
]
