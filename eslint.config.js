import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'

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
        plugins: {
            prettier: prettierPlugin
        },
        rules: {
            'prettier/prettier': 'error',
            'vue/multi-word-component-names': 'off',
            'vue/no-v-html': 'off'
        }
    },
    prettierConfig,
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
