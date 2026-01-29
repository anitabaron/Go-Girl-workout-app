import { Page } from "@playwright/test";
import { createExercises, type ExerciseTestData } from "./exercises";
import { WorkoutPlansPage } from "../pages/workout-plans-page";
import { WorkoutPlanFormPage } from "../pages/workout-plan-form-page";

export interface CreateWorkoutPlanOptions {
  planName?: string;
  description?: string;
  part?: string;
  exercises?: Array<Partial<ExerciseTestData>>;
  exerciseTitles?: string[];
}

/**
 * Create a workout plan with exercises.
 *
 * If exerciseTitles is provided, uses existing exercises.
 * If exercises is provided, creates exercises first then the plan.
 * Otherwise creates 2 default exercises and the plan.
 *
 * @param page - Playwright Page object
 * @param options - Plan creation options
 * @returns Object with planName and planId
 */
export async function createWorkoutPlan(
  page: Page,
  options: CreateWorkoutPlanOptions = {},
): Promise<{ planName: string; planId: string }> {
  const planName = options.planName ?? `Session Flow Plan ${Date.now()}`;
  const description = options.description ?? "Plan for E2E session flow test";
  const part = options.part ?? "Arms";

  let exerciseTitles: string[];

  if (options.exerciseTitles && options.exerciseTitles.length > 0) {
    exerciseTitles = options.exerciseTitles;
  } else if (options.exercises && options.exercises.length > 0) {
    exerciseTitles = await createExercises(page, options.exercises);
  } else {
    exerciseTitles = await createExercises(page, [
      { part: "Arms", series: 2, reps: 5, restBetween: 30 },
      { part: "Legs", series: 2, reps: 5, restBetween: 30 },
    ]);
  }

  const workoutPlansPage = new WorkoutPlansPage(page);
  await workoutPlansPage.goto();
  await page.waitForLoadState("networkidle", { timeout: 60000 });

  const isListVisible = await workoutPlansPage.isListVisible();
  const isEmptyStateVisible = await workoutPlansPage.isEmptyStateVisible();
  if (!isListVisible && !isEmptyStateVisible) {
    throw new Error("Failed to navigate to workout plans page");
  }

  await workoutPlansPage.clickCreatePlan();

  const workoutPlanFormPage = new WorkoutPlanFormPage(page);
  await workoutPlanFormPage.waitForForm();

  await workoutPlanFormPage.fillRequiredFields({
    name: planName,
    description,
    part,
  });

  await workoutPlanFormPage.addExercises(exerciseTitles);
  await page.waitForTimeout(500);

  await workoutPlanFormPage.submit();
  await workoutPlanFormPage.waitForSaveNavigation();

  await page.waitForLoadState("networkidle", { timeout: 60000 });
  await page.reload();
  await page.waitForLoadState("networkidle", { timeout: 60000 });
  await workoutPlansPage.waitForList();

  let planId: string | null = null;
  for (let attempt = 0; attempt < 15; attempt++) {
    planId = await workoutPlansPage.getPlanIdByName(planName);
    if (planId) break;
    await page.waitForTimeout(500 + attempt * 500);
    if (attempt % 3 === 2) {
      await page.reload();
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      await workoutPlansPage.waitForList();
    }
  }

  if (!planId) {
    throw new Error(`Plan "${planName}" was not found after creation`);
  }

  return { planName, planId };
}
