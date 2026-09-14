export type ParsedUrl = {
  path: string;
  query: Record<string, string>;
};

/** `/tasks?x=1` или `https://host/tasks?x=1` — host игнорируется. */
export function parseRequestUrl(url: string): ParsedUrl {
  const trimmed = url.trim();
  let pathWithQuery = trimmed;

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    try {
      const u = new URL(trimmed);
      pathWithQuery = `${u.pathname}${u.search}`;
    } catch {
      pathWithQuery = trimmed;
    }
  }

  const qIndex = pathWithQuery.indexOf('?');
  const pathRaw = qIndex >= 0 ? pathWithQuery.slice(0, qIndex) : pathWithQuery;
  const queryString = qIndex >= 0 ? pathWithQuery.slice(qIndex + 1) : '';

  const path = normalizePath(pathRaw);
  const query: Record<string, string> = {};

  if (queryString) {
    for (const part of queryString.split('&')) {
      if (!part) continue;
      const eq = part.indexOf('=');
      const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
      const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '');
      if (key) query[key] = value;
    }
  }

  return { path, query };
}

export function normalizePath(path: string): string {
  if (!path || path === '') return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  if (withSlash.length > 1 && withSlash.endsWith('/')) {
    return withSlash.slice(0, -1);
  }
  return withSlash;
}

export type PathPattern = {
  regex: RegExp;
  paramNames: string[];
  pattern: string;
};

export function compilePath(pattern: string): PathPattern {
  const normalized = normalizePath(pattern);
  const paramNames: string[] = [];
  const parts = normalized.split('/').map((segment) => {
    if (segment.startsWith(':')) {
      paramNames.push(segment.slice(1));
      return '([^/]+)';
    }
    return escapeRegex(segment);
  });
  const regex = new RegExp(`^${parts.join('/')}$`);
  return { regex, paramNames, pattern: normalized };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchPath(compiled: PathPattern, path: string): Record<string, string> | null {
  const m = compiled.regex.exec(path);
  if (!m) return null;
  const params: Record<string, string> = {};
  compiled.paramNames.forEach((name, i) => {
    params[name] = decodeURIComponent(m[i + 1] ?? '');
  });
  return params;
}
