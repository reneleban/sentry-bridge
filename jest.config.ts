import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json",
    },
  },
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/__tests__/**"],
  moduleNameMapper: {
    "^digest-fetch$": "<rootDir>/src/__mocks__/digest-fetch.ts",
  },
  reporters: [
    "default",
    [
      "jest-html-reporter",
      {
        pageTitle: "obico-prusalink-bridge Test Report",
        outputPath: "reports/test-report.html",
        includeFailureMsg: true,
        includeConsoleLog: true,
      },
    ],
    [
      "jest-junit",
      {
        outputDirectory: "reports",
        outputName: "junit.xml",
      },
    ],
  ],
};

export default config;
