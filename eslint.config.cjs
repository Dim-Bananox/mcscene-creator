const reactPlugin = require('eslint-plugin-react')
const jsxA11yPlugin = require('eslint-plugin-jsx-a11y')
const prettierPlugin = require('eslint-plugin-prettier')
const prettierConfig = require('eslint-config-prettier')

const mergeRules = (...ruleSets) => Object.assign({}, ...ruleSets.map(r => (r && r.rules) || {}))

const recommendedRules = mergeRules(
	reactPlugin && reactPlugin.configs && reactPlugin.configs.recommended,
	jsxA11yPlugin && jsxA11yPlugin.configs && jsxA11yPlugin.configs.recommended,
	prettierConfig && prettierConfig.configs && prettierConfig.configs.recommended
)

module.exports = [
	{
		// Apply to JS/JSX files
		files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
		ignores: ['node_modules/**', 'dist/**', 'build/**'],

		// Language / parser options
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2021,
				sourceType: 'module',
				ecmaFeatures: { jsx: true }
			}
			// "env" equivalent: you can add global names here if you need them,
			// but most environments will work without explicit globals in flat config.
		},

		// Make plugin implementations available under the given names.
		// eslint will call plugin meta to register rules.
		plugins: {
			react: reactPlugin,
			'jsx-a11y': jsxA11yPlugin,
			prettier: prettierPlugin
		},

		// Merge recommended plugin rules first, then apply your overrides.
		rules: Object.assign({}, recommendedRules, {
			// Your explicit rules from .eslintrc
			'prettier/prettier': ['warn'],
			'react/react-in-jsx-scope': 'off',
			'react/prop-types': 'off',
			'no-unused-vars': 'off',
			'jsx-a11y/no-noninteractive-element-interactions': 'off',
			'jsx-a11y/click-events-have-key-events': 'warn',
			'no-restricted-imports': ['error', { patterns: ['@/features/*/*'] }]
		}),

		// Settings are supported in the flat config and kept here.
		settings: {
			react: {
				version: 'detect'
			}
		},

		// Report unused eslint-disable directives (similar to "reportUnusedDisableDirectives").
		linterOptions: {
			reportUnusedDisableDirectives: true
		}
	}
]
