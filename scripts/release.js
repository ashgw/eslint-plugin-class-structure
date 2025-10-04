import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function sh(cmd) {
  return execSync(cmd, { stdio: "inherit" });
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

const token = process.env.NPM_TOKEN;
if (!token) {
  console.error("NPM_TOKEN is not set");
  process.exit(1);
}

const pkg = readJSON("./package.json");
if (!pkg.version) {
  console.error("package.json missing version");
  process.exit(1);
}

try {
  // check working tree
  sh("git diff --quiet || (echo 'Uncommitted changes' && exit 1)");
  sh(
    "git diff --cached --quiet || (echo 'Staged but uncommitted changes' && exit 1)"
  );

  // build
  sh("bun run build");

  // smoke test import
  sh(
    "node -e \"import('./dist/index.js').then(p=>{ if(!p.default?.rules?.enforce){ throw new Error('plugin export missing'); } })\""
  );

  // tag and publish
  const tag = `v${pkg.version}`;
  sh(`git tag ${tag}`);
  sh("git push --tags");

  // publish
  sh("npm publish --access public");

  console.log(`Published ${pkg.name}@${pkg.version}`);
} catch (e) {
  process.exit(typeof e.status === "number" ? e.status : 1);
}
