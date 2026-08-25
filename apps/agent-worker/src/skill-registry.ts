import { readFile, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import type { SkillDialect } from "@tracefolio/agent-contracts";
import { AgentLoopError } from "./errors.js";

const MAX_SKILL_BYTES = 128 * 1024;
const skillNamePattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

const skillFolderByDialect: Record<SkillDialect, string> = {
  codex: ".agents",
  "claude-code": ".claude",
};

export interface LoadedSkill {
  dialect: SkillDialect;
  name: string;
  content: string;
  path: string;
}

export async function loadSkill(
  projectRoot: string,
  dialect: SkillDialect,
  skillName: string,
): Promise<LoadedSkill> {
  if (!skillNamePattern.test(skillName)) {
    throw new AgentLoopError(
      "INVALID_REQUEST",
      "Skill name must use lowercase letters, numbers, and hyphens only.",
      400,
    );
  }

  const skillRoot = resolve(projectRoot, skillFolderByDialect[dialect], "skills");
  const skillPath = resolve(skillRoot, skillName, "SKILL.md");

  if (!skillPath.startsWith(`${skillRoot}${sep}`)) {
    throw new AgentLoopError("INVALID_REQUEST", "Skill path is outside the allowed root.", 400);
  }

  try {
    const metadata = await stat(skillPath);

    if (metadata.size > MAX_SKILL_BYTES) {
      throw new AgentLoopError(
        "SKILL_TOO_LARGE",
        "The selected skill is larger than the 128 KB safety limit.",
        413,
      );
    }

    return {
      dialect,
      name: skillName,
      content: await readFile(skillPath, "utf8"),
      path: skillPath,
    };
  } catch (error) {
    if (error instanceof AgentLoopError) {
      throw error;
    }

    throw new AgentLoopError(
      "SKILL_NOT_FOUND",
      `No ${dialect} skill named "${skillName}" was found in the local skill directory.`,
      404,
    );
  }
}
