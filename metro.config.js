const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

// backend/ is a separate Next.js app (~85k files). Metro crawls the project root;
// on Windows that often triggers EMFILE, and failed opens surface as "Unable to resolve".
config.resolver.blockList.push(/(?:^|[\\/])backend[\\/].*/);

config.resolver.unstable_enablePackageExports = true;
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

const { resolve: metroResolve } = require("metro-resolver");

function resolveProjectAlias(context, moduleName, platform) {
  if (!moduleName.startsWith("@/")) {
    return null;
  }

  const subpath = moduleName.slice(2);
  const base = path.join(projectRoot, subpath);
  const sourceExts = context.sourceExts ?? config.resolver.sourceExts;

  const candidates = [
    base,
    ...sourceExts.map((ext) => `${base}.${ext}`),
    ...sourceExts.map((ext) => path.join(base, `index.${ext}`)),
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return { type: "sourceFile", filePath: candidate };
      }
    } catch {
      // EMFILE on Windows can make existsSync/statSync fail; avoid false "Unable to resolve".
    }
  }

  return null;
}

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const aliasHit = resolveProjectAlias(context, moduleName, platform);
  if (aliasHit) {
    return aliasHit;
  }

  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return metroResolve(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
