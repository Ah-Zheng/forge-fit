import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...pluginVue.configs['flat/recommended'],
    {
        files: ['*.vue', '**/*.vue'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser
            }
        }
    },
    {
        languageOptions: {
            globals: {
                window: 'readonly',
                localStorage: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                ImportMeta: 'readonly',
                Storage: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLElement: 'readonly'
            }
        },
        rules: {
            'vue/multi-word-component-names': 'off',
            'vue/no-v-html': 'off'
        }
    },
    {
        ignores: [
            '**/dist/**',
            '**/.turbo/**',
            '**/node_modules/**',
            '**/.system_generated/**',
            '**/.gemini/**',
            '**/pnpm-lock.yaml'
        ]
    }
]
