import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

export default {
  verbose: true,
  preset: "ts-jest/presets/default-esm",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts"],
  testTimeout: 30000,
  testMatch: ["**/?(*-)+(test).ts"],
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: "<rootDir>/" }),
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
};
