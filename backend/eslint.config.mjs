import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended,
    security.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
            parserOptions: {
                project: './tsconfig.eslint.json',
            },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'security/detect-object-injection': 'off' // False positives common in backend
        },
    },
    {
        files: ['**/*.js'],
        ...tseslint.configs.disableTypeChecked,
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        }
    },
    {
        ignores: ['node_modules/', 'dist/', 'build/', 'coverage/'],
    }
);
