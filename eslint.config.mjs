import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    // Neue React-Compiler-Regeln aus eslint-config-next 16: der bestehende
    // SendReportDialog setzt State bewusst in Effects. Nur warnen, nicht blocken.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
