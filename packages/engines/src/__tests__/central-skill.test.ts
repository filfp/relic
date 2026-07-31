import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

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
const openAiMetadata = readFileSync(
  resolve(skillRoot, "agents/openai.yaml"),
  "utf8",
);
const normalizedSkill = skill.replaceAll(/\s+/g, " ");

describe("central Relic skill distribution source", () => {
  test("is one portable skill without executable workflow machinery", () => {
    expect(skill).toMatch(/^---\nname: relic\n/);
    expect(skill).toContain("repository contains .relic/RELIC.md");
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
      "read `.relic/RELIC.md` as the first Relic context step",
    );
    expect(skill).toContain("Do not load the whole corpus by default");
    expect(normalizedSkill).toContain("or require `relic search` as a gateway");
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
      "Its YAML frontmatter is the sole topology authority",
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

  test("ships optional Codex UI metadata without making it the skill authority", () => {
    expect(openAiMetadata).toContain('display_name: "Relic"');
    expect(openAiMetadata).toContain("Use $relic");
    expect(skill).not.toContain("agents/openai.yaml");
  });
});
