import { resolve } from "node:path";
import { validateContentDir } from "./node";
import { hasErrors, type Issue } from "./validate";

const USAGE = `Usage: validate-content [--allow-draft] [--content <dir>]

  --allow-draft   Dev only: allow lexemes that are not yet "approved".
  --content <dir> Content root (default: the repo's content/ folder).`;

/** Returns the process exit code: 0 ok, 1 content errors, 2 bad usage. */
export function runCli(
  argv: string[],
  defaultRoot: string,
  log: (line: string) => void = console.log,
): number {
  let allowDraft = false;
  let root = defaultRoot;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--allow-draft") allowDraft = true;
    else if (arg === "--content" && argv[i + 1]) root = resolve(argv[++i]!);
    else if (arg === "--help" || arg === "-h") {
      log(USAGE);
      return 0;
    } else {
      log(`Unknown argument: ${arg}\n\n${USAGE}`);
      return 2;
    }
  }

  const issues = validateContentDir(root, { allowDraft });
  for (const issue of issues) log(formatIssue(issue));

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.length - errors;
  if (hasErrors(issues)) {
    log(`\n✗ Content invalid: ${errors} error(s), ${warnings} warning(s).`);
    return 1;
  }
  log(`✓ Content valid${warnings ? ` (${warnings} warning(s))` : ""}.`);
  return 0;
}

export function formatIssue(issue: Issue): string {
  const tag = issue.severity === "error" ? "ERROR" : "WARN ";
  return `${tag} [${issue.rule}]${issue.file ? ` ${issue.file}:` : ""} ${issue.message}`;
}
