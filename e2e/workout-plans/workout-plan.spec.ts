import { test, expect } from "@playwright/test";
import { authenticateUser } from "../fixtures";
import { ExercisesPage } from "../pages/exercises-page";
import { ExerciseFormPage } from "../pages/exercise-form-page";
import { WorkoutPlansPage } from "../pages/workout-plans-page";
import { WorkoutPlanFormPage } from "../pages/workout-plan-form-page";

/**
 * E2E tests for workout plans workflow
 *
 * Tests verify:
 * - User can add exercises to the database
 * - User can create a workout plan from exercises
 * - User can save the workout plan
 * - User can edit the saved workout plan
 * - Changes are persisted correctly
 */
test.describe("Workout Plan E2E - Create and Edit", () => {
  test("should create workout plan from exercises and then edit it", async ({
    page,
  }) => {
    test.setTimeout(60000); // Increase timeout to 60s for CI
    // Step 1: Login
    await authenticateUser(page);

    // Step 2: Add first exercise
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    const isListVisible = await exercisesPage.isListVisible();
    const isEmptyStateVisible = await exercisesPage.isEmptyStateVisible();
    expect(isListVisible || isEmptyStateVisible).toBe(true);

    await exercisesPage.clickAddExercise();

    const formPage = new ExerciseFormPage(page);
    await formPage.waitForForm();

    const exercise1Title = `Test Exercise 1 ${Date.now()}`;
    await formPage.fillRequiredFields({
      title: exercise1Title,
      type: "Main Workout",
      part: "Arms",
      series: 3,
      reps: 10,
      restBetween: 60,
    });

    await formPage.submit();
    await formPage.waitForSaveNavigation();
    await exercisesPage.waitForList();

    // Verify first exercise was created
    const exercise1Exists =
      await exercisesPage.hasExerciseWithTitle(exercise1Title);
    expect(exercise1Exists).toBe(true);

    // Step 3: Add second exercise
    await exercisesPage.clickAddExercise();
    await formPage.waitForForm();

    const exercise2Title = `Test Exercise 2 ${Date.now()}`;
    await formPage.fillRequiredFields({
      title: exercise2Title,
      type: "Warm-up",
      part: "Legs",
      series: 2,
      reps: 15,
      restBetween: 30,
    });

    await formPage.submit();
    await formPage.waitForSaveNavigation();
    await exercisesPage.waitForList();

    // Verify second exercise was created
    const exercise2Exists =
      await exercisesPage.hasExerciseWithTitle(exercise2Title);
    expect(exercise2Exists).toBe(true);

    // Step 4: Navigate to workout plans page
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    // Step 5: Create new workout plan
    await workoutPlansPage.clickCreatePlan();

    const workoutPlanFormPage = new WorkoutPlanFormPage(page);
    await workoutPlanFormPage.waitForForm();

    // Step 6: Fill workout plan metadata
    const planName = `Test Workout Plan ${Date.now()}`;
    await workoutPlanFormPage.fillRequiredFields({
      name: planName,
      description: "Test workout plan description",
      part: "Arms",
    });

    // Step 7: Add exercises to the plan
    await workoutPlanFormPage.addExercise(exercise1Title);

    // Wait a bit for the exercise to appear in the list
    await page.waitForTimeout(500);

    // Verify exercise was added
    const exercise1InPlan =
      await workoutPlanFormPage.hasExercise(exercise1Title);
    expect(exercise1InPlan).toBe(true);

    // Add second exercise
    await workoutPlanFormPage.addExercise(exercise2Title);
    await page.waitForTimeout(500);

    // Verify second exercise was added
    const exercise2InPlan =
      await workoutPlanFormPage.hasExercise(exercise2Title);
    expect(exercise2InPlan).toBe(true);

    // Step 8: Update exercise parameters in the plan
    // Update section type for second exercise (it's already Warm-up, but we can verify it's set)
    // Update planned sets for first exercise
    await workoutPlanFormPage.updateExercisePlannedSets(exercise1Title, 4);
    await page.waitForTimeout(500);

    // Step 9: Save the workout plan
    await workoutPlanFormPage.submit();
    await workoutPlanFormPage.waitForSaveNavigation();

    // Step 10: Verify plan was created and appears in the list
    await workoutPlansPage.waitForList();
    const planExists = await workoutPlansPage.hasPlanWithName(planName);
    expect(planExists).toBe(true);

    // Verify plan card exists and contains plan name
    const planCard = await workoutPlansPage.getPlanCardByName(planName);
    expect(planCard).not.toBeNull();
    if (planCard) {
      const cardText = await planCard.textContent();
      // Verify plan name is displayed
      expect(cardText).toContain(planName);
      // Estimated time is displayed only if estimated_total_time_seconds is set
      // This is optional, so we don't require it in the test
    }

    // Step 11: Edit the workout plan
    await workoutPlansPage.clickEditPlanByName(planName);

    // Wait for edit form to load
    await workoutPlanFormPage.waitForForm();

    // Verify form is pre-filled with original data
    const nameValue = await workoutPlanFormPage.nameInput.inputValue();
    expect(nameValue).toBe(planName);

    // Step 12: Modify the plan
    const updatedPlanName = `Updated Workout Plan ${Date.now()}`;
    await workoutPlanFormPage.fillName(updatedPlanName);

    // Change description
    await workoutPlanFormPage.fillDescription("Updated description");

    // Change part
    await workoutPlanFormPage.selectPart("Legs");

    // Update exercise parameters
    await workoutPlanFormPage.updateExercisePlannedSets(exercise1Title, 5);
    await page.waitForTimeout(500);

    // Step 13: Save the changes
    await workoutPlanFormPage.submit();
    await workoutPlanFormPage.waitForSaveNavigation();
    
    // Wait for page to fully load after navigation
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    
    // Step 14: Verify we're redirected to the plans list page (not details page)
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/workout-plans\/?$/);
    
    // Hard reload with cache bypass to ensure we see the latest data from the server
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    
    // Additional wait to ensure data is fully loaded
    await page.waitForTimeout(1000);

    // Step 15: Verify the plan was updated on list page
    await workoutPlansPage.waitForList();

    // First verify new name exists (confirms update worked)
    // This is more reliable than checking if old name doesn't exist
    let reloadCount = 0;
    await expect.poll(
      async () => {
        // Reload page periodically to bypass cache (every 3rd attempt)
        reloadCount++;
        if (reloadCount > 1 && reloadCount % 3 === 0) {
          await page.reload({ waitUntil: "networkidle" });
          await workoutPlansPage.waitForList();
        }
        return await workoutPlansPage.hasPlanWithName(updatedPlanName);
      },
      {
        message: `New plan name "${updatedPlanName}" should exist`,
        timeout: 20000, // Reduced since we already verified on details page
        intervals: [1000, 2000, 3000],
      }
    ).toBe(true);

    // Reload once more before checking old name to ensure fresh data
    await page.reload({ waitUntil: "networkidle" });
    await workoutPlansPage.waitForList();
    await page.waitForTimeout(500);

    // Then verify old name does not exist (use polling with periodic cache bypass)
    reloadCount = 0;
    await expect.poll(
      async () => {
        // Reload page periodically to bypass cache (every 3rd attempt)
        reloadCount++;
        if (reloadCount > 1 && reloadCount % 3 === 0) {
          await page.reload({ waitUntil: "networkidle" });
          await workoutPlansPage.waitForList();
        }
        return await workoutPlansPage.hasPlanWithName(planName);
      },
      {
        message: `Old plan name "${planName}" should not exist`,
        timeout: 30000, // Increased for CI pipeline
        intervals: [1000, 2000, 3000],
      }
    ).toBe(false);
  });

  test("should validate that plan must have at least one exercise (TC-WP-001 edge case)", async ({
    page,
  }) => {
    // Step 1: Login
    await authenticateUser(page);

    // Step 2: Navigate to workout plans page
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    // Step 3: Create new workout plan
    await workoutPlansPage.clickCreatePlan();

    const workoutPlanFormPage = new WorkoutPlanFormPage(page);
    await workoutPlanFormPage.waitForForm();

    // Step 4: Fill workout plan metadata (but don't add exercises)
    const planName = `Empty Plan ${Date.now()}`;
    await workoutPlanFormPage.fillRequiredFields({
      name: planName,
      description: "Plan without exercises",
      part: "Arms",
    });

    // Step 5: Try to save without exercises
    await workoutPlanFormPage.submit();

    // Step 6: Verify validation error is shown
    // The form should show an error and not navigate away
    await page.waitForTimeout(1000);

    // Check if we're still on the form page (validation should prevent navigation)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/workout-plans/new");

    // Check for validation error message
    const form = workoutPlanFormPage.form;
    const formText = await form.textContent();
    // The error message should mention that plan needs at least one exercise
    expect(formText).toMatch(/ćwiczen|exercise|musi zawierać|co najmniej/i);
  });

  test("should verify changes are visible in plan details after edit (TC-WP-002 requirement)", async ({
    page,
  }) => {
    // Step 1: Login
    await authenticateUser(page);

    // Step 2: Add exercise
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    await exercisesPage.clickAddExercise();
    const formPage = new ExerciseFormPage(page);
    await formPage.waitForForm();

    const exerciseTitle = `Detail Test Exercise ${Date.now()}`;
    await formPage.fillRequiredFields({
      title: exerciseTitle,
      type: "Main Workout",
      part: "Arms",
      series: 3,
      reps: 10,
      restBetween: 60,
    });

    await formPage.submit();
    await formPage.waitForSaveNavigation();
    await exercisesPage.waitForList();

    // Step 3: Create workout plan
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    await workoutPlansPage.clickCreatePlan();
    const workoutPlanFormPage = new WorkoutPlanFormPage(page);
    await workoutPlanFormPage.waitForForm();

    const planName = `Details Test Plan ${Date.now()}`;
    await workoutPlanFormPage.fillRequiredFields({
      name: planName,
      description: "Original description",
    });

    await workoutPlanFormPage.addExercise(exerciseTitle);
    await page.waitForTimeout(500);

    await workoutPlanFormPage.submit();
    await workoutPlanFormPage.waitForSaveNavigation();
    
    // After save, we're redirected to list page
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    
    // Reload to ensure we see the latest data from the server
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    
    await workoutPlansPage.waitForList();

    // Step 4: Get plan ID and navigate to details
    // Use polling to handle potential timing issues
    let planId: string | null = null;
    await expect.poll(
      async () => {
        planId = await workoutPlansPage.getPlanIdByName(planName);
        return planId !== null;
      },
      {
        message: `Plan "${planName}" should appear in the list`,
        timeout: 30000, // Increased for CI pipeline
        intervals: [500, 1000, 2000],
      }
    ).toBe(true);
    
    expect(planId).not.toBeNull();

    if (planId) {
      // Navigate to plan details
      await page.goto(`/workout-plans/${planId}`);
      await page.waitForLoadState("networkidle", { timeout: 60000 });

      // Verify original data is displayed
      const pageContent = await page.textContent("body");
      expect(pageContent).toContain(planName);
      expect(pageContent).toContain("Original description");
      expect(pageContent).toContain(exerciseTitle);

      // Step 5: Edit the plan
      await workoutPlansPage.clickEditPlanByName(planName);
      await workoutPlanFormPage.waitForForm();

      // Step 6: Modify the plan
      const updatedPlanName = `Updated Details Plan ${Date.now()}`;
      await workoutPlanFormPage.fillName(updatedPlanName);
      await workoutPlanFormPage.fillDescription("Updated description");

      await workoutPlanFormPage.submit();
      await workoutPlanFormPage.waitForSaveNavigation();
      
      // After edit, we're redirected to list page
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      
      // Navigate to details page to verify changes
      await page.goto(`/workout-plans/${planId}`);
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      
      // Refresh the page to ensure we see the latest data from the server
      await page.reload();
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      
      // Verify updated data is displayed in details
      const updatedPageContent = await page.textContent("body");
      expect(updatedPageContent).toContain(updatedPlanName);
      expect(updatedPageContent).toContain("Updated description");
      expect(updatedPageContent).not.toContain("Original description");
    }
  });

  test("should create workout plan with multiple exercises and verify all are saved", async ({
    page,
  }) => {
    test.setTimeout(60000); // Increase timeout to 60s for CI
    // Step 1: Login
    await authenticateUser(page);

    // Step 2: Add multiple exercises
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    const formPage = new ExerciseFormPage(page);
    const exerciseTitles: string[] = [];

    // Create 3 exercises
    for (let i = 1; i <= 3; i++) {
      await exercisesPage.clickAddExercise();
      await formPage.waitForForm();

      const exerciseTitle = `Test Exercise ${i} ${Date.now()}`;
      exerciseTitles.push(exerciseTitle);

      await formPage.fillRequiredFields({
        title: exerciseTitle,
        type: i === 1 ? "Warm-up" : i === 2 ? "Main Workout" : "Cool-down",
        part: i === 1 ? "Arms" : i === 2 ? "Legs" : "Core",
        series: 2 + i,
        reps: 10 + i * 2,
        restBetween: 30 + i * 10,
      });

      await formPage.submit();
      await formPage.waitForSaveNavigation();
      await exercisesPage.waitForList();
    }

    // Step 3: Create workout plan
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState("networkidle", { timeout: 60000 });

    await workoutPlansPage.clickCreatePlan();

    const workoutPlanFormPage = new WorkoutPlanFormPage(page);
    await workoutPlanFormPage.waitForForm();

    const planName = `Multi-Exercise Plan ${Date.now()}`;
    await workoutPlanFormPage.fillRequiredFields({
      name: planName,
      description: "Plan with multiple exercises",
    });

    // Step 4: Add all exercises to the plan
    for (const exerciseTitle of exerciseTitles) {
      await workoutPlanFormPage.addExercise(exerciseTitle);
      await page.waitForTimeout(500);

      // Verify exercise was added
      const exerciseInPlan =
        await workoutPlanFormPage.hasExercise(exerciseTitle);
      expect(exerciseInPlan).toBe(true);
    }

    // Step 5: Save the plan
    await workoutPlanFormPage.submit();
    await workoutPlanFormPage.waitForSaveNavigation();

    // Step 6: Verify plan was created
    await workoutPlansPage.waitForList();
    
    // Reload to ensure we see the latest data
    await page.reload();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await workoutPlansPage.waitForList();
    
    // Use polling to ensure plan is visible
    await expect.poll(
      async () => {
        return await workoutPlansPage.hasPlanWithName(planName);
      },
      {
        message: `Plan "${planName}" should appear in the list`,
        timeout: 30000, // Increased for CI pipeline
        intervals: [500, 1000, 2000],
      }
    ).toBe(true);

    // Step 7: Edit the plan and verify all exercises are still there
    await workoutPlansPage.clickEditPlanByName(planName);
    await workoutPlanFormPage.waitForForm();

    // Verify all exercises are still in the plan
    for (const exerciseTitle of exerciseTitles) {
      const exerciseInPlan =
        await workoutPlanFormPage.hasExercise(exerciseTitle);
      expect(exerciseInPlan).toBe(true);
    }

    // Step 8: Remove one exercise
    await workoutPlanFormPage.removeExercise(exerciseTitles[0]);
    await page.waitForTimeout(500);

    // Verify it was removed
    const removedExerciseInPlan = await workoutPlanFormPage.hasExercise(
      exerciseTitles[0],
    );
    expect(removedExerciseInPlan).toBe(false);

    // Verify other exercises are still there
    for (let i = 1; i < exerciseTitles.length; i++) {
      const exerciseInPlan = await workoutPlanFormPage.hasExercise(
        exerciseTitles[i],
      );
      expect(exerciseInPlan).toBe(true);
    }

    // Step 9: Save the changes
    await workoutPlanFormPage.submit();
    await workoutPlanFormPage.waitForSaveNavigation();

    // Step 10: Verify the plan was updated
    // After edit, we're redirected to list page
    await page.goto('/workout-plans');
    await page.waitForLoadState('networkidle');
    await workoutPlansPage.waitForList();
    const planStillExists = await workoutPlansPage.hasPlanWithName(planName);
    expect(planStillExists).toBe(true);
  });
});
