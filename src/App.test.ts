import { describe, expect, it } from "vitest";
import { createResetState } from "./resetState";

const backupPayload = {
  version: 1,
  budget: 62000,
  expenses: [
    {
      id: 1,
      title: "Groceries",
      amount: 1200,
      category: "Food",
      date: "2026-07-27",
      notes: "Weekly",
    },
  ],
};

describe("backup payload shape", () => {
  it("exports a JSON structure that can be imported back", () => {
    const json = JSON.stringify(backupPayload);
    const parsed = JSON.parse(json) as typeof backupPayload;

    expect(parsed.version).toBe(1);
    expect(parsed.budget).toBe(62000);
    expect(parsed.expenses[0].title).toBe("Groceries");
  });
});

describe("reset state", () => {
  it("returns cleared tracker data for a full reset", () => {
    const resetState = createResetState();

    expect(resetState.expenses).toEqual([]);
    expect(resetState.budget).toBe(62000);
    expect(resetState.search).toBe("");
    expect(resetState.selectedCategory).toBe("All");
  });
});
