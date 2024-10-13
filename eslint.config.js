import eslintPluginSvelte from "eslint-plugin-svelte";
import svelteConfig from "./svelte.config.js";
export default [
	{
		ignores: ["build/", ".svelte-kit/"],
	},
	...eslintPluginSvelte.configs["flat/recommended"],
	{
		files: ["**/*.svelte"],
		languageOptions: {
			parserOptions: {
				svelteConfig,
				parser: "@typescript-eslint/parser",
			},
		},
	},
];
