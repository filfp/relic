import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../../../..");
const skillRoot = resolve(repositoryRoot, "skills/relic");
const skill = readFileSync(resolve(skillRoot, "SKILL.md"), "utf8");
const authoring = readFileSync(
  resolve(skillRoot, "references/knowledge-authoring.md"),
  "utf8",
);
const semanticHtml = readFileSync(
  resolve(skillRoot, "references/semantic-html.md"),
  "utf8",
);
const federation = readFileSync(
  resolve(skillRoot, "references/federation.md"),
  "utf8",
);
const roast = readFileSync(resolve(skillRoot, "references/roast.md"), "utf8");
const openAiMetadata = readFileSync(
  resolve(skillRoot, "agents/openai.yaml"),
  "utf8",
);
const normalizedSkill = skill.replaceAll(/\s+/g, " ");

function files(root: string): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (directory: string): void => {
    for (const name of readdirSync(directory).sort()) {
      const path = resolve(directory, name);
      if (statSync(path).isDirectory()) {
        visit(path);
      } else {
        result[relative(root, path).replaceAll("\\", "/")] =
          readFileSync(path, "utf8");
      }
    }
  };
  visit(root);
  return result;
}

describe("central Relic skill distribution source", () => {
  test("is one portable skill without executable workflow machinery", () => {
    expect(skill).toMatch(/^---\nname: relic\n/);
    expect(skill).toContain("repository contains relic.yaml");
    expect(readdirSync(skillRoot).sort()).toEqual([
      "SKILL.md",
      "agents",
      "references",
    ]);
    expect(existsSync(resolve(skillRoot, "scripts"))).toBe(false);
  });

  test("enters through project-owned instructions and progressive knowledge", () => {
    expect(skill).toContain("Honor the repository's `AGENTS.md`");
    expect(normalizedSkill).toContain(
      "read that boundary's `relic.yaml` as the first Relic context step",
    );
    expect(normalizedSkill).toContain(
      "Stop at that first boundary; never continue upward",
    );
    expect(skill).toContain("Do not load the whole corpus by default");
    expect(normalizedSkill).toContain("or require `relic search` as a gateway");
  });

  test("loads federation guidance only from an explicitly selected boundary", () => {
    expect(skill).toContain("When the selected `relic.yaml` declares `federation.members`");
    expect(skill).toContain("Ignore that reference when federation is absent");
    expect(federation).toContain("do not scan the filesystem for undeclared");
    expect(federation).toContain("global monorepo knowledge is intentionally absent");
    expect(federation).toContain("does not forbid ordinary file edits");
    expect(federation).toContain("Do not choose a project owner from path overlap");
  });

  test("opens every reference with its trigger and a contents index", () => {
    const references = {
      "roast.md": roast,
      "federation.md": federation,
      "knowledge-authoring.md": authoring,
      "semantic-html.md": semanticHtml,
    };
    const shape = Object.fromEntries(
      Object.entries(references).map(([name, content]) => [
        name,
        {
          trigger: /^# .+\n\nRead this reference/.test(content),
          contents: content.includes("\n## Contents\n"),
        },
      ]),
    );
    expect(shape).toEqual(
      Object.fromEntries(
        Object.keys(references).map((name) => [
          name,
          { trigger: true, contents: true },
        ]),
      ),
    );
  });

  test("routes every focused reference through one explicit trigger", () => {
    expect(skill).toContain("## Route References Deliberately");
    expect(normalizedSkill).toContain(
      "Read a reference only when its trigger fires; never open one to check",
    );
    expect(normalizedSkill).toContain("Most tasks fire no trigger");
    for (const reference of [
      "references/roast.md",
      "references/federation.md",
      "references/knowledge-authoring.md",
      "references/semantic-html.md",
    ]) {
      expect(skill.split(`(${reference})`).length - 1).toBe(1);
    }
  });

  test("suspends mutation while a blocking fork stays open", () => {
    expect(normalizedSkill).toContain(
      "While a blocking fork is open on the affected boundary, investigation continues and mutation stops",
    );
    expect(normalizedSkill).toContain(
      "until the developer answers it or authorizes progress under a stated assumption",
    );
    expect(normalizedSkill).toContain(
      "no mutation may be presented as pending confirmation and performed in the same turn",
    );
    expect(normalizedSkill).toContain(
      "Unblocked boundaries continue",
    );
  });

  test("treats a duplicated path as a material finding", () => {
    expect(normalizedSkill).toContain(
      "Treat a duplicated path as a material finding, not a preference",
    );
    expect(normalizedSkill).toContain(
      "in code or in knowledge, is at least P1",
    );
  });

  test("grounds the roast discipline without adding a lifecycle", () => {
    expect(roast).toContain(
      "Read this reference when the developer requests a roast or a grill",
    );
    expect(roast.replaceAll(/\s+/g, " ")).toContain(
      "Rounds order questions; they are not a lifecycle the developer must complete",
    );
    expect(roast).toContain("Finding facts is your job");
    expect(roast.replaceAll(/\s+/g, " ")).toContain(
      "Do not require a particular delegation, command, or engine capability",
    );
    expect(roast.replaceAll(/\s+/g, " ")).toContain(
      "Never write it to a file or turn it into session state",
    );
    expect(roast.replaceAll(/\s+/g, " ")).toContain(
      "never lift it. Only the developer does",
    );
    expect(roast.replaceAll(/\s+/g, " ")).toContain(
      "an empty frontier is not a precondition for starting work",
    );
  });

  test("covers discovery without a user-facing mode or second invocation", () => {
    expect(normalizedSkill).toContain("Never ask the developer to select a mode");
    expect(normalizedSkill).toContain(
      "continue into code, tests, and validation without requiring a second prompt",
    );
    expect(skill).toContain(
      "contradiction, blocking fork, derivable solution, accepted risk",
    );
  });

  test("derives coherent decisions and asks only about material forks", () => {
    expect(skill).toContain(
      "Resolve a finding directly when established constraints leave one coherent solution",
    );
    expect(skill).toContain(
      "recommend a course before asking for a decision",
    );
    expect(skill).toContain(
      "Ask only when multiple valid choices materially change behavior",
    );
  });

  test("keeps persistence explicit and fixes documentation-optional", () => {
    expect(skill).toContain("Using Relic as context creates no documentation obligation");
    expect(skill).toMatch(
      /fixes that restore an existing contract do\s+not automatically need a record/,
    );
    expect(skill).toContain(
      "agreement with a decision alone does not authorize an unspecified documentation write",
    );
    expect(skill).toContain("Write only after authorization");
  });

  test("supports compliance and cross-session handoff with repository evidence", () => {
    expect(skill).toContain(
      "connect each relevant requirement or decision to implementation and",
    );
    expect(normalizedSkill).toContain(
      "Handoff with the decisions that govern the result",
    );
    expect(normalizedSkill).toContain(
      "Keep it in the conversation unless the developer explicitly requests a handoff",
    );
  });

  test("authors living knowledge from topology without hidden state", () => {
    expect(authoring).toContain(
      "sole authority for that project's destinations",
    );
    expect(authoring).toContain(
      "federation does not replace or merge any member's",
    );
    expect(authoring).toContain("Only `id` is required metadata");
    expect(authoring).toContain(
      "There is no persisted counter, lock, reservation, tombstone, or generator",
    );
    expect(authoring).toContain("Use ordinary relative Markdown or HTML links");
    expect(authoring).toContain("Git is the historical recovery");
  });

  test("keeps canonical specification HTML semantic and presentation-free", () => {
    expect(semanticHtml).toContain('<relic-body id="012-spec-viewer">');
    expect(semanticHtml).toContain("Use standard semantic HTML first");
    expect(semanticHtml).toContain("<relic-flow>");
    expect(semanticHtml).toContain("The frontend owns styling");
    expect(semanticHtml).toContain(
      "HTML is the only specification mode",
    );
  });

  test("ships Codex-owned UI metadata without making it portable authority", () => {
    expect(openAiMetadata).toContain('display_name: "Relic"');
    expect(openAiMetadata).toContain("Use $relic");
    expect(skill).not.toContain("agents/openai.yaml");
  });

  test("keeps self-hosted installs aligned with their target contracts", () => {
    const canonical = files(skillRoot);
    const portable = Object.fromEntries(
      Object.entries(canonical).filter(
        ([path]) => path !== "agents/openai.yaml",
      ),
    );

    expect(files(resolve(repositoryRoot, ".codex/skills/relic"))).toEqual(
      canonical,
    );
    expect(files(resolve(repositoryRoot, ".agents/skills/relic"))).toEqual(
      portable,
    );
    expect(files(resolve(repositoryRoot, ".claude/skills/relic"))).toEqual(
      portable,
    );
  });
});
