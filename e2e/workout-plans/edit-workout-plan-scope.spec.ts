import { test, expect } from "@playwright/test";
import {
  authenticateUser,
  createExercises,
  createWorkoutPlan,
} from "../fixtures";
import { WorkoutPlansPage } from "../pages/workout-plans-page";
import { WorkoutPlanFormPage } from "../pages/workout-plan-form-page";

test.describe("Edit Workout Plan - Scope Regression", () => {
  test("should save edited plan after adding scope with two exercises", async ({
    page,
  }) => {
    test.setTimeout(90000);

    await authenticateUser(page);

    const [baseExercise1, baseExercise2, scopeExercise1, scopeExercise2] =
      await createExercises(page, [
        { part: "Arms", series: 3, reps: 10, restBetween: 60 },
        { part: "Back", series: 3, reps: 8, restBetween: 60 },
        { part: "Legs", series: 4, reps: 12, restBetween: 90 },
        { part: "Core", series: 3, reps: 20, restBetween: 45 },
      ]);

    const planName = `Scope Edit Plan ${Date.now()}`;
    await createWorkoutPlan(page, {
      planName,
      exerciseTitles: [baseExercise1, baseExercise2],
    });

    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await workoutPlansPage.waitForList();

    await workoutPlansPage.clickEditPlanByName(planName);

    const formPage = new WorkoutPlanFormPage(page);
    await formPage.waitForForm();

    await formPage.addScope([scopeExercise1, scopeExercise2], 3);
    expect(await formPage.hasExercise(scopeExercise1)).toBe(true);
    expect(await formPage.hasExercise(scopeExercise2)).toBe(true);
    await formPage.updateFirstScopeOrder(1);
    await formPage.moveExerciseUp(scopeExercise2);

    await formPage.submit();
    await formPage.waitForSaveNavigation();

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await workoutPlansPage.waitForList();
    await expect
      .poll(async () => workoutPlansPage.hasPlanWithName(planName), {
        message: `Plan "${planName}" should still exist after edit save`,
        timeout: 20000,
        intervals: [500, 1000, 2000],
      })
      .toBe(true);
  });
});
