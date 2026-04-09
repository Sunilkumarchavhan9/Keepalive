import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { FollowUpLoop, KeepaliveState } from "@/lib/keepalive/types";

const DEFAULT_STATE: KeepaliveState = {
  loops: [],
};

export class KeepaliveStore {
  private cache: KeepaliveState | null = null;

  constructor(
    private readonly filePath = process.env.KEEPALIVE_STORE_PATH ??
      path.join(process.cwd(), ".keepalive", "state.json")
  ) {}

  async getState(): Promise<KeepaliveState> {
    if (this.cache) {
      return this.clone(this.cache);
    }

    try {
      const raw = await readFile(this.filePath, "utf8");
      this.cache = this.normalize(JSON.parse(raw) as Partial<KeepaliveState>);
    } catch {
      this.cache = this.clone(DEFAULT_STATE);
      await this.persist();
    }

    return this.clone(this.cache);
  }

  async listOpenLoops(): Promise<FollowUpLoop[]> {
    const state = await this.getState();
    return state.loops
      .filter((loop) => loop.status === "open")
      .sort((left, right) => left.dueAt.localeCompare(right.dueAt));
  }

  async saveLoop(loop: FollowUpLoop): Promise<void> {
    const state = await this.getState();
    const existingIndex = state.loops.findIndex((item) => item.id === loop.id);

    if (existingIndex >= 0) {
      state.loops[existingIndex] = loop;
    } else {
      state.loops.push(loop);
    }

    this.cache = state;
    await this.persist();
  }

  async updateLoop(
    id: string,
    updater: (loop: FollowUpLoop) => FollowUpLoop
  ): Promise<FollowUpLoop | null> {
    const state = await this.getState();
    const existingIndex = state.loops.findIndex((item) => item.id === id);

    if (existingIndex < 0) {
      return null;
    }

    const updated = updater(state.loops[existingIndex]);
    state.loops[existingIndex] = updated;
    this.cache = state;
    await this.persist();
    return updated;
  }

  async closeLoop(id: string, reason: string): Promise<FollowUpLoop | null> {
    return this.updateLoop(id, (loop) => ({
      ...loop,
      status: "closed",
      closedAt: new Date().toISOString(),
      closedReason: reason,
    }));
  }

  private normalize(input: Partial<KeepaliveState>): KeepaliveState {
    return {
      loops: Array.isArray(input.loops) ? input.loops : [],
    };
  }

  private async persist(): Promise<void> {
    if (!this.cache) {
      return;
    }

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      JSON.stringify(this.cache, null, 2),
      "utf8"
    );
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
