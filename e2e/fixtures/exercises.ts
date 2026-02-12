import { Page } from "@playwright/test";
import { ExercisesPage } from "../pages/exercises-page";
import { ExerciseFormPage } from "../pages/exercise-form-page";

/**
 * Exercise test data builder
 */
export interface ExerciseTestData {
  title: string;
  type: string;
  part: string;
  series: number;
  reps?: number;
  duration?: number;
  restBetween?: number;
  restAfter?: number;
}

/**
 * Default exercise test data
 */
export const defaultExerciseData: Partial<ExerciseTestData> = {
  type: "Main Workout",
  part: "Arms",
  series: 3,
  restBetween: 60,
};

/**
 * Create a new exercise in the application
 *
 * This is a helper function that encapsulates the common flow of:
 * 1. Navigating to exercises page
 * 2. Clicking add exercise
 * 3. Filling the form
 * 4. Submitting
 * 5. Verifying it was created
 *
 * @param page - Playwright Page object
 * @param exerciseData - Exercise data to create
 * @returns The title of the created exercise
 */
export async function createExercise(
  page: Page,
  exerciseData: Partial<ExerciseTestData> = {},
): Promise<string> {
  const exercisesPage = new ExercisesPage(page);
  await exercisesPage.goto();
  await page.waitForLoadState("networkidle");

  // Verify we're on exercises page
  const isListVisible = await exercisesPage.isListVisible();
  const isEmptyStateVisible = await exercisesPage.isEmptyStateVisible();
  if (!isListVisible && !isEmptyStateVisible) {
    throw new Error("Failed to navigate to exercises page");
  }

  // Click add exercise
  await exercisesPage.clickAddExercise();

  // Fill and submit form
  const formPage = new ExerciseFormPage(page);
  await formPage.waitForForm();

  // Generate unique title if not provided (timestamp + random to avoid collisions in parallel/retries)
  const title =
    exerciseData.title ||
    `Test Exercise ${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Merge with defaults
  const finalData: ExerciseTestData = {
    title,
    ...defaultExerciseData,
    ...exerciseData,
  } as ExerciseTestData;

  // Form validation requires exactly one metric: reps or duration.
  // Do not enforce default reps; if caller did not specify any metric,
  // use a neutral duration fallback for fixture compatibility.
  if (finalData.reps === undefined && finalData.duration === undefined) {
    finalData.duration = 30;
  }

  await formPage.fillRequiredFields({
    title: finalData.title,
    type: finalData.type,
    part: finalData.part,
    series: finalData.series,
    reps: finalData.reps,
    duration: finalData.duration,
    restBetween: finalData.restBetween,
    restAfter: finalData.restAfter,
  });

  await formPage.submit();
  await formPage.waitForSaveNavigation();
  await exercisesPage.waitForList();

  // Verify exercise was created
  const exerciseExists = await exercisesPage.hasExerciseWithTitle(
    finalData.title,
  );
  if (!exerciseExists) {
    throw new Error(
      `Exercise "${finalData.title}" was not created successfully`,
    );
  }

  return finalData.title;
}

/**
 * Create multiple exercises
 *
 * @param page - Playwright Page object
 * @param exercisesData - Array of exercise data (or count for default exercises)
 * @returns Array of created exercise titles
 */
export async function createExercises(
  page: Page,
  exercisesData: Array<Partial<ExerciseTestData>> | number = 1,
): Promise<string[]> {
  // If number provided, create that many default exercises
  if (typeof exercisesData === "number") {
    const count = exercisesData;
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await createExercise(page, {
        part: i % 2 === 0 ? "Arms" : "Legs", // Alternate parts for variety
      });
      titles.push(title);
    }
    return titles;
  }

  // Otherwise create exercises with provided data
  const titles: string[] = [];
  for (const exerciseData of exercisesData) {
    const title = await createExercise(page, exerciseData);
    titles.push(title);
  }
  return titles;
}
