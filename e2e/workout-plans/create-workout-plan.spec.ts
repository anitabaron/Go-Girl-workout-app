import { test, expect } from '@playwright/test';
import { authenticateUser } from '../fixtures';
import { ExercisesPage } from '../pages/exercises-page';
import { ExerciseFormPage } from '../pages/exercise-form-page';
import { WorkoutPlansPage } from '../pages/workout-plans-page';
import { WorkoutPlanFormPage } from '../pages/workout-plan-form-page';

/**
 * E2E tests for creating workout plans
 * 
 * Tests verify:
 * - User can add exercises to the library
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
    
    // Step 2: Add first exercise
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    await page.waitForLoadState('networkidle');
    
    const isListVisible = await exercisesPage.isListVisible();
    const isEmptyStateVisible = await exercisesPage.isEmptyStateVisible();
    expect(isListVisible || isEmptyStateVisible).toBe(true);
    
    await exercisesPage.clickAddExercise();
    
    const exerciseFormPage = new ExerciseFormPage(page);
    await exerciseFormPage.waitForForm();
    
    const exercise1Title = `Test Exercise 1 ${Date.now()}`;
    await exerciseFormPage.fillRequiredFields({
      title: exercise1Title,
      type: 'Main Workout',
      part: 'Arms',
      series: 3,
      reps: 10,
      restBetween: 60,
    });
    
    await exerciseFormPage.submit();
    await exerciseFormPage.waitForSaveNavigation();
    await exercisesPage.waitForList();
    
    // Verify first exercise was created
    const exercise1Exists = await exercisesPage.hasExerciseWithTitle(exercise1Title);
    expect(exercise1Exists).toBe(true);
    
    // Step 3: Add second exercise
    await exercisesPage.clickAddExercise();
    await exerciseFormPage.waitForForm();
    
    const exercise2Title = `Test Exercise 2 ${Date.now()}`;
    await exerciseFormPage.fillRequiredFields({
      title: exercise2Title,
      type: 'Main Workout',
      part: 'Legs',
      series: 4,
      reps: 12,
      restBetween: 90,
    });
    
    await exerciseFormPage.submit();
    await exerciseFormPage.waitForSaveNavigation();
    await exercisesPage.waitForList();
    
    // Verify second exercise was created
    const exercise2Exists = await exercisesPage.hasExerciseWithTitle(exercise2Title);
    expect(exercise2Exists).toBe(true);
    
    // Step 4: Navigate to workout plans page
    const workoutPlansPage = new WorkoutPlansPage(page);
    await workoutPlansPage.goto();
    await page.waitForLoadState('networkidle');
    
    // Wait for either list or empty state to be visible
    const isPlansListVisible = await workoutPlansPage.isListVisible();
    const isPlansEmptyStateVisible = await workoutPlansPage.isEmptyStateVisible();
    
    // Verify we're on workout plans page (either list or empty state)
    expect(isPlansListVisible || isPlansEmptyStateVisible).toBe(true);
    
    // Step 5: Click "Create Plan" button
    await workoutPlansPage.clickCreatePlan();
    
    // Step 6: Fill workout plan form
    const planFormPage = new WorkoutPlanFormPage(page);
    await planFormPage.waitForForm();
    
    const planName = `Test Workout Plan ${Date.now()}`;
    await planFormPage.fillRequiredFields({
      name: planName,
      description: 'Test workout plan description',
      part: 'Arms',
    });
    
    // Step 7: Add exercises to the plan
    await planFormPage.addExercises([exercise1Title, exercise2Title]);
    
    // Verify exercises were added to the plan
    const exerciseCount = await planFormPage.getExerciseCount();
    expect(exerciseCount).toBeGreaterThanOrEqual(2);
    
    // Step 8: Save the plan
    await planFormPage.submit();
    
    // Step 9: Wait for navigation back to workout plans list
    await planFormPage.waitForSaveNavigation();
    await workoutPlansPage.waitForList();
    
    // Step 10: Verify plan appears in the list
    const planExists = await workoutPlansPage.hasPlanWithName(planName);
    expect(planExists).toBe(true);
  });
});
