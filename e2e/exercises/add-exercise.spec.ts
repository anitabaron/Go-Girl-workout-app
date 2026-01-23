import { test, expect } from '@playwright/test';
import { authenticateUser } from '../fixtures';
import { ExercisesPage } from '../pages/exercises-page';
import { ExerciseFormPage } from '../pages/exercise-form-page';

/**
 * E2E tests for adding and editing exercises
 * 
 * Tests verify:
 * - User can navigate to exercises page
 * - User can open add exercise form (from header button or empty state)
 * - User can fill exercise form
 * - User can save exercise
 * - Exercise appears in the list after saving
 * - User can edit a newly created exercise
 * - Changes are saved correctly
 */
test.describe('Add and Edit Exercise E2E', () => {
  test('should add a new exercise successfully', async ({ page }) => {
    // Step 1: Login
    await authenticateUser(page);
    
    // Step 2: Navigate to exercises page
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Wait for either list or empty state to be visible
    const isListVisible = await exercisesPage.isListVisible();
    const isEmptyStateVisible = await exercisesPage.isEmptyStateVisible();
    
    // Verify we're on exercises page (either list or empty state)
    expect(isListVisible || isEmptyStateVisible).toBe(true);
    
    // Step 3: Click "Add Exercise" button (from header - should be always visible)
    // The clickAddExercise method already waits for button and navigation
    await exercisesPage.clickAddExercise();
    
    // Step 4: Wait for form page and fill the form
    const formPage = new ExerciseFormPage(page);
    await formPage.waitForForm();
    
    // Fill required fields
    const exerciseTitle = `Test Exercise ${Date.now()}`;
    await formPage.fillRequiredFields({
      title: exerciseTitle,
      type: 'Main Workout',
      part: 'Arms',
      series: 3,
      reps: 10,
      restBetween: 60,
    });
    
    // Step 5: Save the exercise
    await formPage.submit();
    
    // Step 6: Wait for navigation back to exercises list
    await formPage.waitForSaveNavigation();
    
    // After saving, we should have at least one exercise, so list should be visible
    await exercisesPage.waitForList();
    
    // Verify exercise appears in the list
    const exerciseExists = await exercisesPage.hasExerciseWithTitle(exerciseTitle);
    expect(exerciseExists).toBe(true);
  });

  test('should add and then edit an exercise successfully', async ({ page }) => {
    // Step 1: Login
    await authenticateUser(page);
    
    // Step 2: Navigate to exercises page
    const exercisesPage = new ExercisesPage(page);
    await exercisesPage.goto();
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Wait for either list or empty state to be visible
    const isListVisible = await exercisesPage.isListVisible();
    const isEmptyStateVisible = await exercisesPage.isEmptyStateVisible();
    
    // Verify we're on exercises page (either list or empty state)
    expect(isListVisible || isEmptyStateVisible).toBe(true);
    
    // Step 3: Click "Add Exercise" button
    await exercisesPage.clickAddExercise();
    
    // Step 4: Fill and save the form
    const formPage = new ExerciseFormPage(page);
    await formPage.waitForForm();
    
    const originalTitle = `Test Exercise ${Date.now()}`;
    await formPage.fillRequiredFields({
      title: originalTitle,
      type: 'Main Workout',
      part: 'Arms',
      series: 3,
      reps: 10,
      restBetween: 60,
    });
    
    // Save the exercise
    await formPage.submit();
    
    // Wait for navigation back to exercises list
    await formPage.waitForSaveNavigation();
    await exercisesPage.waitForList();
    
    // Verify exercise appears in the list
    const exerciseExists = await exercisesPage.hasExerciseWithTitle(originalTitle);
    expect(exerciseExists).toBe(true);
    
    // Step 5: Edit the exercise
    // Click edit button on the exercise card
    await exercisesPage.clickEditExerciseByTitle(originalTitle);
    
    // Wait for edit form to load
    await formPage.waitForForm();
    
    // Verify form is pre-filled with original data
    const titleValue = await formPage.titleInput.inputValue();
    expect(titleValue).toBe(originalTitle);
    
    // Step 6: Modify the exercise data
    const updatedTitle = `Updated Exercise ${Date.now()}`;
    await formPage.fillTitle(updatedTitle);
    
    // Change some other fields
    await formPage.selectPart('Legs');
    await formPage.fillReps(15);
    await formPage.fillSeries(4);
    await formPage.fillRestBetween(90);
    await formPage.fillRestAfter(120);
    
    // Step 7: Save the changes
    await formPage.submit();
    
    // Wait for navigation back to exercises list
    await formPage.waitForSaveNavigation();
    await exercisesPage.waitForList();
    
    // Step 8: Verify the exercise was updated
    // Old title should not exist
    const oldTitleExists = await exercisesPage.hasExerciseWithTitle(originalTitle);
    expect(oldTitleExists).toBe(false);
    
    // New title should exist
    const newTitleExists = await exercisesPage.hasExerciseWithTitle(updatedTitle);
    expect(newTitleExists).toBe(true);
  });
});
