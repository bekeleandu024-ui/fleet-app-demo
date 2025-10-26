const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const postcss = require("postcss");
const ts = require("typescript");
const { compile } = require("tailwindcss");

const DEFAULT_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const SIMPLE_CLASS_TOKENS = new Set([
  "flex",
  "grid",
  "block",
  "inline",
  "inline-block",
  "inline-flex",
  "contents",
  "hidden",
  "sr-only",
  "border",
  "rounded",
  "relative",
  "absolute",
  "sticky",
  "peer",
  "group",
  "table",
  "table-row",
  "table-cell",
  "uppercase",
  "lowercase",
  "capitalize",
  "italic",
  "not-italic",
  "transition",
  "transform",
  "underline",
  "line-through",
  "no-underline",
  "truncate",
  "shadow",
  "antialiased",
  "subpixel-antialiased",
  "whitespace-nowrap",
  "whitespace-pre",
  "whitespace-pre-wrap",
  "whitespace-pre-line",
  "break-words",
  "break-all",
  "font-light",
  "font-normal",
  "font-medium",
  "font-semibold",
  "font-bold",
  "text-left",
  "text-center",
  "text-right",
  "items-start",
  "items-center",
  "items-end",
  "justify-start",
  "justify-center",
  "justify-between",
  "justify-end",
  "list-disc",
  "list-decimal",
  "list-none",
]);

function findConfig(explicit) {
  if (explicit) {
    const resolved = path.resolve(process.cwd(), explicit);
    if (fs.existsSync(resolved)) return resolved;
    return null;
  }

  const candidates = [
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
  ];

  for (const candidate of candidates) {
    const full = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(full)) return full;
  }

  return null;
}

function resolveModule(request, baseDir) {
  const paths = [];
  if (baseDir) paths.push(baseDir);
  paths.push(process.cwd());

  try {
    return require.resolve(request, { paths });
  } catch (err) {
    if (request.startsWith(".") || path.isAbsolute(request)) {
      const resolved = path.resolve(baseDir || process.cwd(), request);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
    throw err;
  }
}

async function loadModule(id, base, hint) {
  const resolvedPath = resolveModule(id, base);
  const mod = require(resolvedPath);
  const exported = mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
  return { path: resolvedPath, base: path.dirname(resolvedPath), module: exported };
}

async function loadStylesheet(id, base) {
  const resolvedPath = resolveModule(id, base);
  const content = await fsp.readFile(resolvedPath, "utf8");
  return { path: resolvedPath, base: path.dirname(resolvedPath), content };
}

function shouldIncludeToken(token) {
  if (!token) return false;
  if (SIMPLE_CLASS_TOKENS.has(token)) return true;
  return /[-:/#[\].]|\d/.test(token);
}

function addTokensFromText(text, set) {
  if (!text) return;
  for (const part of text.split(/\s+/)) {
    const token = part.trim();
    if (!token) continue;
    if (shouldIncludeToken(token)) {
      set.add(token);
    }
  }
}

function collectFromExpression(expr, set) {
  if (!expr) return;
  const kind = expr.kind;
  switch (kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral: {
      addTokensFromText(expr.text, set);
      return;
    }
    case ts.SyntaxKind.TemplateExpression: {
      addTokensFromText(expr.head.text, set);
      for (const span of expr.templateSpans) {
        collectFromExpression(span.expression, set);
        addTokensFromText(span.literal.text, set);
      }
      return;
    }
    case ts.SyntaxKind.TemplateLiteralExpression: {
      addTokensFromText(expr.text, set);
      return;
    }
    case ts.SyntaxKind.ParenthesizedExpression:
    case ts.SyntaxKind.AsExpression:
    case ts.SyntaxKind.TypeAssertionExpression: {
      collectFromExpression(expr.expression, set);
      return;
    }
    case ts.SyntaxKind.ArrayLiteralExpression: {
      for (const element of expr.elements) {
        collectFromExpression(element, set);
      }
      return;
    }
    case ts.SyntaxKind.ConditionalExpression: {
      collectFromExpression(expr.whenTrue, set);
      collectFromExpression(expr.whenFalse, set);
      return;
    }
    case ts.SyntaxKind.BinaryExpression: {
      const operator = expr.operatorToken.kind;
      if (
        operator === ts.SyntaxKind.AmpersandAmpersandToken ||
        operator === ts.SyntaxKind.BarBarToken
      ) {
        collectFromExpression(expr.right, set);
        return;
      }
      if (operator === ts.SyntaxKind.PlusToken) {
        collectFromExpression(expr.left, set);
        collectFromExpression(expr.right, set);
        return;
      }
      return;
    }
    case ts.SyntaxKind.CallExpression: {
      if (ts.isIdentifier(expr.expression) && expr.expression.text === "cn") {
        for (const arg of expr.arguments) {
          collectFromExpression(arg, set);
        }
      }
      return;
    }
    case ts.SyntaxKind.ObjectLiteralExpression: {
      for (const prop of expr.properties) {
        if (ts.isPropertyAssignment(prop)) {
          const name = getPropertyName(prop.name);
          if (name) {
            addTokensFromText(name, set);
          }
          collectFromExpression(prop.initializer, set);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          addTokensFromText(prop.name.text, set);
        }
      }
      return;
    }
    default:
      return;
  }
}

function getPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }
  if (ts.isStringLiteralLike(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function collectCandidatesFromFile(filePath, set) {
  const extension = path.extname(filePath);
  const scriptKind =
    extension === ".tsx"
      ? ts.ScriptKind.TSX
      : extension === ".ts"
      ? ts.ScriptKind.TS
      : extension === ".jsx"
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.JS;

  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }

  const source = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      addTokensFromText(node.text, set);
    }

    if (ts.isJsxAttribute(node) && node.name.text === "className") {
      const init = node.initializer;
      if (!init) return;
      if (ts.isStringLiteralLike(init)) {
        addTokensFromText(init.text, set);
      } else if (ts.isJsxExpression(init)) {
        collectFromExpression(init.expression, set);
      }
    }

    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression) && node.expression.text === "cn") {
        for (const arg of node.arguments) {
          collectFromExpression(arg, set);
        }
      }
    }

    if (ts.isVariableDeclaration(node) && node.initializer) {
      const nameText = node.name.getText();
      if (/class/i.test(nameText)) {
        collectFromExpression(node.initializer, set);
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const parent = node.parent;
      if (ts.isObjectLiteralExpression(parent)) {
        const container = parent.parent;
        if (ts.isVariableDeclaration(container) && /class/i.test(container.name.getText())) {
          collectFromExpression(node.initializer, set);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

function walkDir(dir, files) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, files);
    } else if (DEFAULT_EXTENSIONS.has(path.extname(entry.name))) {
      files.add(full);
    }
  }
}

function extractDirectoriesFromContent(content) {
  const directories = new Set();
  const patterns = Array.isArray(content)
    ? content
    : content && typeof content === "object" && Array.isArray(content.files)
    ? content.files
    : [];

  if (!patterns.length) {
    directories.add(path.resolve(process.cwd(), "src"));
    return directories;
  }

  for (const pattern of patterns) {
    if (typeof pattern !== "string") continue;
    let normalized = pattern.replace(/\\/g, "/");
    if (normalized.startsWith("./")) normalized = normalized.slice(2);
    const wildcardIndex = normalized.search(/[\*\?\[]/);
    const prefix = wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
    const baseDir = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
    const resolved = path.resolve(process.cwd(), baseDir || ".");
    directories.add(resolved);
  }

  return directories;
}

async function collectCandidates(configPath) {
  let config = null;
  if (configPath) {
    const mod = require(configPath);
    config = mod && typeof mod === "object" && "default" in mod ? mod.default : mod;
  }

  const directories = extractDirectoriesFromContent(config?.content);
  const files = new Set();
  for (const dir of directories) {
    walkDir(dir, files);
  }

  const candidates = new Set();
  for (const filePath of files) {
    collectCandidatesFromFile(filePath, candidates);
  }

  return Array.from(candidates);
}

module.exports = function tailwindcssPostcss(options = {}) {
  const configPath = findConfig(options.config);

  return {
    postcssPlugin: "tailwindcss",
    async Once(root) {
      const sourceCssPath = root.source?.input?.file || path.join(process.cwd(), "src/app/globals.css");
      const compileSource = (() => {
        const original = root.toString();
        if (!configPath) return original;
        return `@config ${JSON.stringify(configPath)};\n${original}`;
      })();

      const candidates = await collectCandidates(configPath);
      const compileOptions = {
        from: sourceCssPath,
        base: configPath ? path.dirname(configPath) : process.cwd(),
        loadModule,
        loadStylesheet,
      };

      const result = await compile(compileSource, compileOptions);
      const builtCss = result.build(candidates);
      const generated = postcss.parse(builtCss, { from: sourceCssPath });

      root.walkAtRules("tailwind", (rule) => rule.remove());
      root.prepend(generated.nodes);
    },
  };
};

module.exports.postcss = true;
