/**
 * Pure function to map API validation error messages to field-level and form-level errors.
 * Used by use-workout-plan-form and use-exercise-form for consistent 400 error handling.
 */

export type ParseApiValidationErrorsResult = {
  fieldErrors: Record<string, string>;
  formErrors: string[];
};

/**
 * Parses API validation error response into field errors and form-level errors.
 *
 * @param message - API error message (often semicolon-separated list of errors)
 * @param details - Optional additional details from API
 * @param fieldMapping - Maps API field names to form field names, e.g. { name: "name", description: "description" }
 * @returns Object with fieldErrors (formField -> message) and formErrors (unassigned messages)
 */
export function parseApiValidationErrors(
  message: string | undefined,
  details: string | undefined,
  fieldMapping: Record<string, string>,
): ParseApiValidationErrorsResult {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  const errorMessages = (message ?? "").split("; ").filter((m) => m.trim());

  if (details && !errorMessages.some((m) => details?.includes(m))) {
    formErrors.push(details);
  }

  for (const errorMsg of errorMessages) {
    let assigned = false;

    for (const [apiField, formField] of Object.entries(fieldMapping)) {
      const normalizedField = apiField.replaceAll("_", " ").toLowerCase();
      const errorLower = errorMsg.toLowerCase();

      if (
        errorLower.includes(apiField.toLowerCase()) ||
        errorLower.includes(normalizedField)
      ) {
        fieldErrors[formField] = errorMsg;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      formErrors.push(errorMsg);
    }
  }

  return { fieldErrors, formErrors };
}
