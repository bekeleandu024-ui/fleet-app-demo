const fs = require("fs/promises");
const path = require("path");
const postcss = require("postcss");
const { pathToFileURL } = require("url");
const { compile } = require("tailwindcss");

const DEFAULT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mdx"]);
const SIMPLE_CLASSES = new Set([
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "block",
  "inline-block",
  "contents",
  "hidden",
  "table",
  "inline-table",
  "sr-only",
  "italic",
  "not-italic",
  "uppercase",
  "lowercase",
  "capitalize",
  "underline",
  "line-through",
  "no-underline",
  "antialiased",
  "subpixel-antialiased",
  "truncate",
  "whitespace-nowrap",
  "whitespace-pre",
  "whitespace-pre-line",
  "whitespace-pre-wrap",
  "break-words",
  "break-all",
  "overflow-hidden",
  "overflow-x-auto",
  "overflow-y-auto",
  "overflow-auto",
  "overflow-visible",
  "overflow-scroll",
]);

function sanitizeToken(token) {
  return token
    .replace(/["'`]/g, "")
    .replace(/[{},]/g, "")
    .trim();
}

function isClassCandidate(token) {
  if (!token) return false;
  const valid = /^[!a-zA-Z0-9:_\-\[\]\/\.\(\),=&%]+$/;
  if (valid.test(token)) return true;
  return SIMPLE_CLASSES.has(token);
}

function stripExpressions(value) {
  let result = "";
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === "$" && value[i + 1] === "{") {
      depth++;
      i += 2;
      while (i < value.length && depth > 0) {
        const c = value[i];
        if (c === "{") {
          depth++;
        } else if (c === "}") {
          depth--;
        }
        i++;
      }
      i -= 1;
      continue;
    }
    if (depth === 0) {
      result += char;
    }
  }
  return result;
}

function addCandidatesFromValue(rawValue, set) {
  if (!rawValue) return;
  const withoutExpressions = rawValue.includes("${") ? stripExpressions(rawValue) : rawValue;
  const cleaned = withoutExpressions.replace(/\s+/g, " ");
  for (const piece of cleaned.split(" ")) {
    const candidate = sanitizeToken(piece);
    if (isClassCandidate(candidate)) {
      set.add(candidate);
    }
  }
}

function extractCandidatesFromExpression(expression, set) {
  const stringLiteral = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  let match;
  while ((match = stringLiteral.exec(expression))) {
    addCandidatesFromValue(match[2], set);
  }
}

function extractCandidates(content, set) {
  const classAttr = /class(?:Name)?\s*=\s*(?:(["'`])([\s\S]*?)\1|\{([\s\S]*?)\})/g;
  let match;
  while ((match = classAttr.exec(content))) {
    if (match[2] != null) {
      addCandidatesFromValue(match[2], set);
    } else if (match[3] != null) {
      extractCandidatesFromExpression(match[3], set);
    }
  }

  const applyDirective = /@apply\s+([^;]+)/g;
  while ((match = applyDirective.exec(content))) {
    addCandidatesFromValue(match[1], set);
  }
}

async function collectCandidatesFromDir(dir, extensions, set) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await collectCandidatesFromDir(fullPath, extensions, set);
    } else if (extensions.has(path.extname(entry.name))) {
      try {
        const content = await fs.readFile(fullPath, "utf8");
        extractCandidates(content, set);
      } catch {
        /* ignore */
      }
    }
  }
}

async function resolveModule(id, base) {
  try {
    return require.resolve(id, { paths: [base] });
  } catch (error) {
    const withExtension = [".js", ".cjs", ".mjs", ".ts", ".tsx", ".json"].map((ext) =>
      path.resolve(base, id.endsWith(ext) ? id : `${id}${ext}`)
    );
    for (const candidate of withExtension) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    }
    throw error;
  }
}

function resolveTailwindStylesheet(id) {
  if (!id.startsWith("tailwindcss")) {
    return null;
  }
  try {
    const pkgPath = require.resolve("tailwindcss/package.json");
    const pkg = require(pkgPath);
    const pkgDir = path.dirname(pkgPath);
    if (id === "tailwindcss") {
      return path.join(pkgDir, pkg.style || "index.css");
    }
    const subPath = id.slice("tailwindcss/".length);
    return path.join(pkgDir, `${subPath}.css`);
  } catch {
    return null;
  }
}

async function loadConfig(configPath) {
  if (!configPath) return {};
  const resolved = await resolveModule(configPath, process.cwd());
  const loaded = await import(pathToFileURL(resolved).href);
  return loaded.default ?? loaded;
}

function getContentEntries(config) {
  if (!config) return [];
  if (Array.isArray(config)) return config.filter((value) => typeof value === "string");
  if (Array.isArray(config.files)) {
    return config.files.filter((value) => typeof value === "string");
  }
  return [];
}

function parseContentTarget(entry) {
  const normalized = entry.replace(/\\/g, "/").replace(/^!/, "");
  const index = normalized.search(/[*!?\[]/);
  const baseSegment = index === -1 ? normalized : normalized.slice(0, index);
  const basePath = baseSegment.length ? baseSegment : ".";
  const directory = path.resolve(process.cwd(), basePath);
  const extensions = new Set(DEFAULT_EXTENSIONS);
  const extMatch = normalized.match(/\.\{([^}]+)}/);
  if (extMatch) {
    extensions.clear();
    for (const ext of extMatch[1].split(",")) {
      const trimmed = ext.trim();
      if (trimmed) {
        extensions.add(trimmed.startsWith(".") ? trimmed : `.${trimmed}`);
      }
    }
  }
  return { directory, extensions };
}

function getContentTargets(config) {
  const entries = getContentEntries(config?.content ?? config);
  const targets = [];
  for (const entry of entries) {
    const target = parseContentTarget(entry);
    const existing = targets.find((item) => item.directory === target.directory);
    if (existing) {
      for (const ext of target.extensions) {
        existing.extensions.add(ext);
      }
    } else {
      targets.push(target);
    }
  }
  if (targets.length === 0) {
    targets.push({ directory: path.resolve(process.cwd(), "src"), extensions: new Set(DEFAULT_EXTENSIONS) });
  }
  return targets;
}

module.exports = function tailwindPostcssPlugin(options = {}) {
  return {
    postcssPlugin: "@tailwindcss/postcss",
    async Once(root) {
      const sourceFile = root.source?.input?.file
        ? path.resolve(root.source.input.file)
        : path.join(process.cwd(), "src/app/globals.css");

      let configDirectivePath = null;
      root.walkAtRules("config", (atRule) => {
        if (configDirectivePath == null) {
          const params = atRule.params.trim().replace(/^['"]|['"]$/g, "");
          configDirectivePath = path.resolve(path.dirname(sourceFile), params);
        }
        atRule.remove();
      });

      const configPath = options.config
        ? path.resolve(process.cwd(), options.config)
        : configDirectivePath ?? null;

      const config = await loadConfig(configPath);
      const candidates = new Set();

      if (config?.safelist) {
        const safelist = Array.isArray(config.safelist)
          ? config.safelist
          : Array.isArray(config.safelist?.standard)
          ? config.safelist.standard
          : [];
        for (const entry of safelist) {
          if (typeof entry === "string" && entry.trim()) {
            candidates.add(entry.trim());
          }
        }
      }

      const targets = getContentTargets(config);
      for (const { directory, extensions } of targets) {
        await collectCandidatesFromDir(directory, extensions, candidates);
      }

      const cssInput = root.toString();
      const compileResult = await compile(cssInput, {
        from: sourceFile,
        loadStylesheet: async (id, base) => {
          const resolvedTailwind = resolveTailwindStylesheet(id);
          const resolved = resolvedTailwind ?? (await resolveModule(id, base));
          const content = await fs.readFile(resolved, "utf8");
          return { path: resolved, base: path.dirname(resolved), content };
        },
        loadModule: async (id, base) => {
          const resolved = await resolveModule(id, base);
          const moduleUrl = pathToFileURL(resolved).href;
          const loaded = await import(moduleUrl);
          return { path: resolved, base: path.dirname(resolved), module: loaded.default ?? loaded };
        },
      });

      const builtCss = compileResult.build(Array.from(candidates));
      const parsed = postcss.parse(builtCss, { from: sourceFile });
      root.removeAll();
      root.append(parsed);
    },
  };
};

module.exports.postcss = true;
