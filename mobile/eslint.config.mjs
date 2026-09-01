import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';

const restrictedSyntax = [
  {
    selector: "VariableDeclaration[kind='let']",
    message: 'let 사용 금지: const를 사용하세요.',
  },
  {
    selector: "FunctionDeclaration:not([parent.type='ExportDefaultDeclaration'])",
    message: '일반 함수는 화살표 함수로 작성하세요.',
  },
  {
    selector: 'FunctionExpression',
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
  {
    selector: 'TSTypeLiteral',
    message: '객체 형태는 interface로 선언하세요.',
  },
  {
    selector: 'TSTypeAliasDeclaration > TSIntersectionType',
    message: '교차 타입은 interface extends로 선언하세요.',
  },
  {
    selector: 'TSTypeAliasDeclaration > TSFunctionType',
    message: '함수 형태는 interface의 호출 시그니처로 선언하세요.',
  },
];

const booleanNaming = {
  format: ['PascalCase'],
  prefix: ['is', 'can', 'has', 'should'],
  types: ['boolean'],
};

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
        projectService: true,
        sourceType: 'module',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react: reactPlugin,
      ts: tsPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'arrow-body-style': ['error', 'as-needed'],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-param-reassign': 'error',
      'no-restricted-syntax': ['error', ...restrictedSyntax],
      'no-shadow': 'off',
      'prefer-const': 'error',
      'react/no-multi-comp': ['error', { ignoreStateless: false }],
      'ts/consistent-type-definitions': ['error', 'interface'],
      'ts/naming-convention': [
        'error',
        { selector: 'variable', ...booleanNaming },
        {
          selector: 'typeProperty',
          ...booleanNaming,
          filter: { match: false, regex: '_' },
        },
      ],
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
  {
    files: ['src/application/**/*.tsx', 'src/components/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        {
          selector: 'TSInterfaceDeclaration[id.name!=/Props$/]',
          message: '컴포넌트 파일에는 Props 인터페이스만 둡니다. 나머지는 src/types 로 옮기세요.',
        },
        {
          selector: 'ExportDefaultDeclaration > :not(FunctionDeclaration)',
          message: 'React 컴포넌트는 export default function ComponentName() 형태로 작성하세요.',
        },
        {
          selector: 'Program:not(:has(ExportDefaultDeclaration > FunctionDeclaration[id.name=/^[A-Z]/]))',
          message: 'React 컴포넌트는 export default function ComponentName() 형태로 작성하세요.',
        },
      ],
    },
  },
];
