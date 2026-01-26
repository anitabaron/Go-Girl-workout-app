import { test, expect } from '@playwright/test';
import { authenticateUser, createExercises } from '../fixtures';
import { WorkoutPlansPage } from '../pages/workout-plans-page';
import { WorkoutPlanFormPage } from '../pages/workout-plan-form-page';

/**
 * E2E tests for creating workout plans
 * 
 * Tests verify:
 * - User can add exercises to the library (via helper function)
 * - User can navigate to workout plans page
 * - User can open create workout plan form
 * - User can fill workout plan form with metadata
 * - User can add exercises to the plan
 * - User can save the plan
 * - Plan appears in the list after saving
 */
test.describe('Create Workout Plan E2E', () => {
  test('should create a workout plan with exercises successfully', async ({ page }) => {
    // Step 1: Login
    await authenticateUser(page);
    
    // Step 2: Create exercises using helper function
    // This encapsulates the common flow of creating exercises
    const exerciseTitles = await createExercises(page, [
      {
        part: 'Arms',
        series: 3,
        reps: 10,
        restBetween: 60,
      },
      {
        part: 'Legs',
        series: 4,
        reps: 12,
        restBetween: 90,
      },
    ]);
    
    expect(exerciseTitles).toHaveLength(2);
    const [exercise1Title, exercise2Title] = exerciseTitles;
    
    // Step 3: Navigate to workout plans page
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Wait for either list or empty state to be visible
    const isPlansListVisible = await workoutPlansPage.isListVisible();
    const isPlansEmptyStateVisible = await workoutPlansPage.isEmptyStateVisible();
    
    // Verify we're on workout plans page (either list or empty state)
    expect(isPlansListVisible || isPlansEmptyStateVisible).toBe(true);
    
    // Step 4: Click "Create Plan" button
    await workoutPlansPage.clickCreatePlan();
    
    // Step 5: Fill workout plan form
    const planFormPage = new WorkoutPlanFormPage(page);
    await planFormPage.waitForForm();
    
    const planName = `Test Workout Plan ${Date.now()}`;
    await planFormPage.fillRequiredFields({
      name: planName,
      description: 'Test workout plan description',
      part: 'Arms',
    });
    
    // Step 6: Add exercises to the plan
    await planFormPage.addExercises([exercise1Title, exercise2Title]);
    
    // Verify exercises were added to the plan
    const exerciseCount = await planFormPage.getExerciseCount();
    expect(exerciseCount).toBeGreaterThanOrEqual(2);
    
    // Step 7: Save the plan
    await planFormPage.submit();
    
    // Step 8: Wait for navigation back to workout plans list
    await planFormPage.waitForSaveNavigation();
    await workoutPlansPage.waitForList();
    
    // Step 9: Verify plan appears in the list
    const planExists = await workoutPlansPage.hasPlanWithName(planName);
    expect(planExists).toBe(true);
  });
});
