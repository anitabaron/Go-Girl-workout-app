-- Sanity clamp for unrealistic Main Workout prescriptions.
-- Applies to existing plans/sessions so previously generated extreme values are corrected.

-- 1) Cap excessive set/rep counts in workout plans.
update workout_plan_exercises
set planned_sets = 6
where section_type = 'Main Workout'
  and planned_sets is not null
  and planned_sets > 6;

update workout_plan_exercises
set planned_reps = 30
where section_type = 'Main Workout'
  and planned_reps is not null
  and planned_reps > 30;

-- 2) Cap excessive durations in workout plans.
-- Isometric-like exercises get stricter max (45 s), other Main Workout duration-based sets max at 120 s.
update workout_plan_exercises
set planned_duration_seconds = 45
where section_type = 'Main Workout'
  and planned_duration_seconds is not null
  and planned_duration_seconds > 45
  and lower(coalesce(exercise_title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)';

update workout_plan_exercises
set planned_duration_seconds = 120
where section_type = 'Main Workout'
  and planned_duration_seconds is not null
  and planned_duration_seconds > 120
  and not (
    lower(coalesce(exercise_title, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
  );

-- 3) Mirror sane caps for already started workout sessions.
update workout_session_exercises
set planned_sets = 6
where exercise_type_at_time = 'Main Workout'
  and planned_sets is not null
  and planned_sets > 6;

update workout_session_exercises
set planned_reps = 30
where exercise_type_at_time = 'Main Workout'
  and planned_reps is not null
  and planned_reps > 30;

update workout_session_exercises
set planned_duration_seconds = 45
where exercise_type_at_time = 'Main Workout'
  and planned_duration_seconds is not null
  and planned_duration_seconds > 45
  and lower(coalesce(exercise_title_at_time, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)';

update workout_session_exercises
set planned_duration_seconds = 120
where exercise_type_at_time = 'Main Workout'
  and planned_duration_seconds is not null
  and planned_duration_seconds > 120
  and not (
    lower(coalesce(exercise_title_at_time, '')) ~ '(hold|isometric|plank|l-?sit|support|wall lean|hollow body)'
  );
