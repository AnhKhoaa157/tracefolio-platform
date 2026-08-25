import { access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { AgentLoopError } from "./errors.js";

const MAX_OUTPUT_CHARACTERS = 48_000;

interface HarnessRunnerOptions {
  projectRoot: string;
  profile: string;
  timeoutMs: number;
}

export class HarnessRunner {
  constructor(private readonly options: HarnessRunnerOptions) {}

  async execute(prompt: string): Promise<string> {
    const harnessRoot = join(this.options.projectRoot, "vendor", "deepseek-harness");
    const harnessPackage = join(harnessRoot, "package.json");
    const harnessModules = join(harnessRoot, "node_modules");

    try {
      await Promise.all([access(harnessPackage), access(harnessModules)]);
    } catch {
      throw new AgentLoopError(
        "HARNESS_NOT_READY",
        "Harness is not ready. Install its local dependencies before running in execute mode.",
        503,
      );
    }

    return new Promise((resolve, reject) => {
      const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
      const child = spawn(
        command,
        ["--dir", harnessRoot, "dsh", "--profile", this.options.profile, `Task:\n${prompt}`],
        {
          cwd: this.options.projectRoot,
          env: {
            ...process.env,
            DSH_HOME: join(this.options.projectRoot, ".tracefolio", "dsh"),
          },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        },
      );

      let output = "";
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, this.options.timeoutMs);

      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output = `${output}${chunk}`.slice(-MAX_OUTPUT_CHARACTERS);
      });

      child.on("error", () => {
        clearTimeout(timeout);
        reject(
          new AgentLoopError(
            "HARNESS_NOT_READY",
            "Harness could not be started from the local checkout.",
            503,
          ),
        );
      });

      child.on("close", (exitCode) => {
        clearTimeout(timeout);

        if (timedOut) {
          reject(
            new AgentLoopError(
              "HARNESS_TIMEOUT",
              "Harness did not complete before the configured timeout.",
              504,
            ),
          );
          return;
        }

        if (exitCode !== 0) {
          reject(
            new AgentLoopError(
              "HARNESS_FAILED",
              "Harness ended without a successful result. Check local Harness/provider configuration.",
              502,
            ),
          );
          return;
        }

        const result = output.trim();
        if (!result) {
          reject(
            new AgentLoopError(
              "HARNESS_FAILED",
              "Harness completed without a final response.",
              502,
            ),
          );
          return;
        }

        resolve(result);
      });
    });
  }
}
