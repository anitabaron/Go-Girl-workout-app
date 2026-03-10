import type { ProgramGeneratedPlanTemplate } from "@/types";

export type ProgramPlannerSource =
  | "existing_plan_selection"
  | "template_library"
  | "mixed_selection";

export type ProgramPlannerProposal = {
  proposal_id: string;
  source: ProgramPlannerSource;
  goal_text: string;
  constraints: string | null;
  assumptions: string[];
  rationale: string[];
  templates: ProgramGeneratedPlanTemplate[];
};

export function createProgramPlannerProposal(params: {
  source: ProgramPlannerSource;
  goalText: string;
  constraints?: string | null;
  templates: ProgramGeneratedPlanTemplate[];
  assumptions?: string[];
  rationale?: string[];
}): ProgramPlannerProposal {
  return {
    proposal_id: `proposal-${Date.now()}`,
    source: params.source,
    goal_text: params.goalText,
    constraints: params.constraints ?? null,
    assumptions:
      params.assumptions ?? [
        "Użytkowniczka nie zgłasza ostrych przeciwwskazań poza zapisanymi w systemie.",
      ],
    rationale:
      params.rationale ?? [
        "Propozycja bazuje na aktualnym celu, guardrailach ćwiczeń i stanie obciążenia.",
      ],
    templates: params.templates,
  };
}
