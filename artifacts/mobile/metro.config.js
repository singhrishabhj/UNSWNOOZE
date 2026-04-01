const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// pnpm monorepo: watch the workspace root so Metro sees all packages hoisted
// to /workspace/node_modules. nodeModulesPaths tells the resolver where to
// look for bare module specifiers (e.g. "expo-router", "react-native").
config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Metro's web bundle URLs are relative to the project root.
// The HTML references bundles as /node_modules/.pnpm/expo-router@.../entry.bundle
// which Metro maps to {projectRoot}/node_modules/.pnpm/... — a symlink in
// artifacts/mobile/node_modules/.pnpm → ../../../node_modules/.pnpm provides
// the actual file. Enable symlink following so Metro can resolve these paths.
config.resolver.followSymlinks = true;

module.exports = config;
