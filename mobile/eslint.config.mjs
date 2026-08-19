import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/node_modules/**', '**/android/**', '**/ios/**', '**/build/**', '**/dist/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      ts: tsPlugin,
    },
    rules: {
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-param-reassign': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "VariableDeclaration[kind='let']",
          message: 'let 사용 금지: const를 사용하세요.',
        },
        {
          selector: "FunctionDeclaration:not([parent.type='ExportDefaultDeclaration'])",
          message: '일반 함수는 화살표 함수로 작성하세요.',
        },
        {
          selector: 'ExportDefaultDeclaration > FunctionDeclaration[id.name!=/^[A-Z]/]',
          message: 'default function은 React 컴포넌트에만 사용하세요.',
        },
        {
          selector: 'ForStatement, ForInStatement, ForOfStatement',
          message: 'for문 사용 금지: 배열 메서드나 재귀를 사용하세요.',
        },
      ],
      'no-shadow': 'off',
      'prefer-const': 'error',
      'ts/consistent-type-definitions': ['error', 'interface'],
      'ts/no-shadow': 'error',
      'ts/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
