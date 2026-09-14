export type FailRule = {
  failEvery?: number;
  failNth?: number;
};

export function shouldFail(count: number, rule: FailRule): boolean {
  const { failEvery, failNth } = rule;
  if (failNth !== undefined && failNth > 0 && count === failNth) {
    return true;
  }
  if (failEvery !== undefined && failEvery > 0 && count % failEvery === 0) {
    return true;
  }
  return false;
}

export function hasFailRule(rule: FailRule): boolean {
  return (
    (rule.failEvery !== undefined && rule.failEvery > 0) ||
    (rule.failNth !== undefined && rule.failNth > 0)
  );
}

/**
 * If the route has its own fail* — global is not mixed in (route > global wholesale).
 * request.config overrides fields on top of the chosen level.
 */
export function resolveFailRule(request: FailRule, route: FailRule, global: FailRule): FailRule {
  const base = hasFailRule(route) ? route : global;
  return {
    failEvery: request.failEvery ?? base.failEvery,
    failNth: request.failNth ?? base.failNth,
  };
}
