// import { dirname } from "path";
// import { fileURLToPath } from "url";
// import { FlatCompat } from "@eslint/eslintrc";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const compat = new FlatCompat({
//   baseDirectory: __dirname,
// });

// const eslintConfig = [
//   ...compat.extends("next/core-web-vitals"),
//   {
//     ignores: [".next/**/*", "node_modules/**/*"],
//   },
// ];

// export default eslintConfig;

import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  js.configs.recommended, // ESLint recommended base rules
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
  {
    languageOptions: {
      globals: {
        console: "readonly",
        fetch: "readonly",
        FileReader: "readonly",
        localStorage: "readonly",
        window: "readonly",
        document: "readonly",
        process: "readonly",
      },
    },
  },
  {
    ignores: [".next/**/*", "node_modules/**/*"],
  },
];
