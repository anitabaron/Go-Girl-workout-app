import { describe, expect, it, vi } from "vitest";
import { updatePersonalRecord } from "@/repositories/personal-records";

type SingleResult = { data: unknown; error: unknown };

function createMockClient(options: {
  existingResult: SingleResult;
  updatedResult: SingleResult;
}) {
  let fromCall = 0;
  let capturedUpdatePayload: Record<string, unknown> | null = null;

  const existingQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(options.existingResult),
  };

  const updateQuery = {
    update: vi.fn((payload: Record<string, unknown>) => {
      capturedUpdatePayload = payload;
      return updateQuery;
    }),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(options.updatedResult),
  };

  const client = {
    from: vi.fn(() => {
      fromCall += 1;
      return fromCall === 1 ? existingQuery : updateQuery;
    }),
  };

  return {
    client,
    getCapturedUpdatePayload: () => capturedUpdatePayload,
  };
}

function buildUpdatedRow(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: "rec-1",
    exercise_id: "ex-1",
    metric_type: "total_reps",
    value: 120,
    series_values: null,
    achieved_at: "2026-02-10T10:00:00.000Z",
    achieved_in_session_id: null,
    achieved_in_set_number: null,
    created_at: "2026-02-10T10:00:00.000Z",
    updated_at: "2026-02-10T10:00:00.000Z",
    user_id: "user-1",
    exercises: {
      id: "ex-1",
      title: "Test exercise",
      types: ["Main Workout"],
      parts: ["Arms"],
      is_save_to_pr: true,
    },
    ...overrides,
  };
}

describe("updatePersonalRecord", () => {
  it("clears achieved_in_session_id and achieved_in_set_number on manual edit", async () => {
    const { client, getCapturedUpdatePayload } = createMockClient({
      existingResult: { data: { id: "rec-1" }, error: null },
      updatedResult: { data: buildUpdatedRow(), error: null },
    });

    const result = await updatePersonalRecord(client as never, "user-1", "rec-1", {
      value: 120,
      achieved_at: "2026-02-10T10:00:00.000Z",
    });

    const payload = getCapturedUpdatePayload();
    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      value: 120,
      achieved_at: "2026-02-10T10:00:00.000Z",
      achieved_in_session_id: null,
      achieved_in_set_number: null,
    });
    expect(payload).not.toHaveProperty("series_values");
    expect(result.error).toBeNull();
    expect(result.data?.achieved_in_session_id).toBeNull();
    expect(result.data?.achieved_in_set_number).toBeNull();
  });

  it("keeps series_values editable when explicitly provided", async () => {
    const { client, getCapturedUpdatePayload } = createMockClient({
      existingResult: { data: { id: "rec-1" }, error: null },
      updatedResult: {
        data: buildUpdatedRow({
          series_values: { "1": 40, "2": 40, "3": 40 },
        }),
        error: null,
      },
    });

    const result = await updatePersonalRecord(client as never, "user-1", "rec-1", {
      value: 120,
      achieved_at: "2026-02-10T10:00:00.000Z",
      series_values: { "1": 40, "2": 40, "3": 40 },
    });

    const payload = getCapturedUpdatePayload();
    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      series_values: { "1": 40, "2": 40, "3": 40 },
      achieved_in_session_id: null,
      achieved_in_set_number: null,
    });
    expect(result.error).toBeNull();
    expect(result.data?.series_values).toEqual({ "1": 40, "2": 40, "3": 40 });
  });
});
