import { test, expect, type Page } from "@playwright/test";
import {
  authenticateUser,
  createExercises,
  createWorkoutPlan,
} from "../fixtures";
import { WorkoutPlansPage } from "../pages/workout-plans-page";
import { WorkoutPlanFormPage } from "../pages/workout-plan-form-page";

async function openPlanEdit(page: Page, planName: string) {
  const workoutPlansPage = new WorkoutPlansPage(page);
  await workoutPlansPage.goto();
  await page.waitForLoadState("networkidle", { timeout: 60000 });
  await workoutPlansPage.waitForList();
  await workoutPlansPage.clickEditPlanByName(planName);
  const formPage = new WorkoutPlanFormPage(page);
  await formPage.waitForForm();
  return { workoutPlansPage, formPage };
}

test.describe("Edit Workout Plan - Scope Regression", () => {
  test("E2E-SCOPE-001 should save after scope reorder and in-scope exercise reorder", async ({
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

    const { workoutPlansPage, formPage } = await openPlanEdit(page, planName);

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

  test("E2E-SCOPE-002 should save mixed single-scope-single layout after moving scope up and down", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await authenticateUser(page);

    const [
      singleExercise1,
      singleExercise2,
      singleExercise3,
      scopeExercise1,
      scopeExercise2,
    ] = await createExercises(page, [
      { part: "Arms", series: 3, reps: 10, restBetween: 60 },
      { part: "Back", series: 3, reps: 8, restBetween: 60 },
      { part: "Chest", series: 3, reps: 10, restBetween: 60 },
      { part: "Legs", series: 4, reps: 12, restBetween: 90 },
      { part: "Core", series: 3, reps: 20, restBetween: 45 },
    ]);

    const planName = `Scope Mixed Layout Plan ${Date.now()}`;
    await createWorkoutPlan(page, {
      planName,
      exerciseTitles: [singleExercise1, singleExercise2, singleExercise3],
    });

    const { workoutPlansPage, formPage } = await openPlanEdit(page, planName);

    await formPage.addScope([scopeExercise1, scopeExercise2], 3);
    await formPage.updateFirstScopeOrder(2);
    await formPage.moveFirstScopeDown();
    await formPage.moveFirstScopeUp();
    await formPage.moveExerciseUp(scopeExercise2);

    await formPage.submit();
    await formPage.waitForSaveNavigation();

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await workoutPlansPage.waitForList();
    await expect
      .poll(async () => workoutPlansPage.hasPlanWithName(planName), {
        message: `Plan "${planName}" should still exist after mixed layout scope edit`,
        timeout: 20000,
        intervals: [500, 1000, 2000],
      })
      .toBe(true);
  });

  test("E2E-SCOPE-003 should save after changing section type for all exercises in a scope", async ({
    page,
  }) => {
    test.setTimeout(90000);
    await authenticateUser(page);

    const [singleExercise, scopeExercise1, scopeExercise2] =
      await createExercises(page, [
        { part: "Arms", series: 3, reps: 10, restBetween: 60 },
        { part: "Legs", series: 4, reps: 12, restBetween: 90 },
        { part: "Core", series: 3, reps: 20, restBetween: 45 },
      ]);

    const planName = `Scope Type Change Plan ${Date.now()}`;
    await createWorkoutPlan(page, {
      planName,
      exerciseTitles: [singleExercise],
    });

    const { workoutPlansPage, formPage } = await openPlanEdit(page, planName);

    await formPage.addScope([scopeExercise1, scopeExercise2], 2);
    await formPage.updateExerciseSectionType(scopeExercise1, "Warm-up");
    await formPage.updateExerciseSectionType(scopeExercise2, "Warm-up");

    await formPage.submit();
    await formPage.waitForSaveNavigation();

    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await workoutPlansPage.waitForList();
    await expect
      .poll(async () => workoutPlansPage.hasPlanWithName(planName), {
        message: `Plan "${planName}" should still exist after scope section-type change`,
        timeout: 20000,
        intervals: [500, 1000, 2000],
      })
      .toBe(true);
  });
});
