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
        File: 'readonly',
        fetch: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        globalThis: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FileReader: 'readonly',
        getComputedStyle: 'readonly',
        // Node.js globals
        process: 'readonly',
        // Injected by Vite's `define` at build time, so undefined to eslint.
        __APP_BUILD__: 'readonly',
        __APP_VERSION__: 'readonly'
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
    // The sync server is Node, not the browser: a different set of globals and
    // no DOM at all.
    files: ['sync-server/**/*.js'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    }
  },
  {
    // Test files run under Vitest/Playwright, not the browser.
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { global: 'readonly', globalThis: 'readonly', Buffer: 'readonly' }
    }
  },
  {
    ignores: [
      'dist',
      'node_modules',
      'sync-server/node_modules',
      '.eslintrc.cjs',
      'playwright-report',
      'test-results'
    ]
  }
]
