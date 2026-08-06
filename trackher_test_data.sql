-- ============================================================
-- TrackHer Test Data for farleysfinest@gmail.com
-- Generated: realistic 7-month HRT journey
-- Late perimenopause, triple HRT, improving with setbacks
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
  v_estradiol_id UUID;
  v_progesterone_id UUID;
  v_testosterone_id UUID;
BEGIN

  -- Look up user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'farleysfinest@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User farleysfinest@gmail.com not found';
  END IF;

  -- ── Clean existing data ──
  DELETE FROM medication_administrations WHERE user_id = v_user_id;
  DELETE FROM dose_logs WHERE user_id = v_user_id;
  DELETE FROM extended_symptom_logs WHERE user_id = v_user_id;
  DELETE FROM symptom_checkins WHERE user_id = v_user_id;
  DELETE FROM lab_results WHERE user_id = v_user_id;
  DELETE FROM medication_changes WHERE user_id = v_user_id;
  DELETE FROM medications WHERE user_id = v_user_id;
  DELETE FROM ai_insights WHERE user_id = v_user_id;

  -- ── Profile ──
  UPDATE profiles SET
    menopause_stage = 'perimenopause',
    has_uterus = TRUE,
    has_uterus_confirmed_at = '2026-01-02T10:00:00Z',
    date_of_birth = '1976-03-15',
    last_period_date = '2025-11-08',
    straw_stage = '-1',
    straw_stage_label = 'Late Perimenopause',
    staging_completed_at = '2026-01-02T10:00:00Z',
    onboarding_completed = TRUE,
    checkin_frequency = 'daily',
    timezone = 'America/Los_Angeles',
    timezone_confirmed_at = '2026-01-02T10:00:00Z'
  WHERE id = v_user_id;

  -- ── Medications ──
  INSERT INTO medications (id, user_id, hormone_category, delivery_method, medication_name, dose_amount, dose_unit, frequency, start_date, is_active)
  VALUES (gen_random_uuid(), v_user_id, 'estrogen', 'patch', 'Estradiol Patch (Vivelle-Dot)', 0.05, 'mg', 'twice_weekly', '2026-01-02', TRUE)
  RETURNING id INTO v_estradiol_id;

  INSERT INTO medications (id, user_id, hormone_category, delivery_method, medication_name, dose_amount, dose_unit, frequency, start_date, is_active)
  VALUES (gen_random_uuid(), v_user_id, 'progesterone', 'oral_capsule', 'Prometrium (micronized progesterone)', 200, 'mg', 'daily', '2026-01-02', TRUE)
  RETURNING id INTO v_progesterone_id;

  INSERT INTO medications (id, user_id, hormone_category, delivery_method, medication_name, dose_amount, dose_unit, frequency, start_date, is_active)
  VALUES (gen_random_uuid(), v_user_id, 'testosterone', 'cream', 'Testosterone Cream (compounded)', 5, 'mg', 'daily', '2026-02-20', TRUE)
  RETURNING id INTO v_testosterone_id;

  -- ── Medication changes ──
  INSERT INTO medication_changes (user_id, medication_id, change_type, previous_dose, new_dose, previous_method, new_method, change_date)
  VALUES (v_user_id, v_estradiol_id, 'started', NULL, 0.05, NULL, NULL, '2026-01-02');
  INSERT INTO medication_changes (user_id, medication_id, change_type, previous_dose, new_dose, previous_method, new_method, change_date)
  VALUES (v_user_id, v_progesterone_id, 'started', NULL, 200, NULL, NULL, '2026-01-02');
  INSERT INTO medication_changes (user_id, medication_id, change_type, previous_dose, new_dose, previous_method, new_method, change_date)
  VALUES (v_user_id, v_testosterone_id, 'started', NULL, 5, NULL, NULL, '2026-02-20');
  INSERT INTO medication_changes (user_id, medication_id, change_type, previous_dose, new_dose, previous_method, new_method, change_date)
  VALUES (v_user_id, v_estradiol_id, 'dose_increased', 0.05, 0.075, NULL, NULL, '2026-03-05');
  INSERT INTO medication_changes (user_id, medication_id, change_type, previous_dose, new_dose, previous_method, new_method, change_date)
  VALUES (v_user_id, v_estradiol_id, 'dose_increased', 0.075, 0.1, NULL, NULL, '2026-05-18');

  -- ── Daily pulse check-ins + weekly MRS ──
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-01', 'pulse', FALSE, FALSE, 2, 2, 2, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-02', 'pulse', FALSE, FALSE, 1, 2, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-03', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-01-04', 'full', TRUE, FALSE, 1, 3, 2, 4, 'none', 3, 1, 4, 2, 3, 3, 4, 2, 1, 2, 0, 2, 2, 3, 1, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-06', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-09', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-10', 'pulse', FALSE, FALSE, 2, 1, 1, 2, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-01-11', 'full', TRUE, FALSE, 1, 2, 2, 3, 'none', 2, 0, 3, 2, 4, 3, 4, 3, 2, 2, 2, 3, 2, 3, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-12', 'pulse', FALSE, FALSE, 1, 2, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-13', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-14', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-15', 'pulse', FALSE, FALSE, 1, 2, 1, 2, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-16', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-17', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-01-18', 'full', TRUE, FALSE, 1, 2, 1, 2, 'none', 3, 1, 3, 1, 3, 2, 4, 3, 3, 3, 3, 1, 3, 2, 2, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-19', 'pulse', FALSE, FALSE, 1, 2, 2, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-20', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-21', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-22', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-23', 'pulse', FALSE, FALSE, 1, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-24', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-01-25', 'full', TRUE, FALSE, 1, 2, 2, 3, 'none', 3, 0, 3, 2, 2, 3, 3, 3, 0, 1, 3, 2, 2, 3, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-26', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-27', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-30', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-01-31', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-02-01', 'full', TRUE, FALSE, 4, 1, 1, 4, 'none', 3, 1, 4, 2, 3, 3, 4, 3, 2, 2, 3, 2, 3, 2, 2, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-02', 'pulse', FALSE, FALSE, 3, 1, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-03', 'pulse', FALSE, FALSE, 1, 1, 2, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-04', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-05', 'pulse', FALSE, FALSE, 3, 2, 4, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-06', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-07', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-02-08', 'full', TRUE, FALSE, 3, 2, 2, 5, 'moderate', 3, 1, 4, 1, 3, 3, 4, 3, 0, 1, 1, 2, 3, 2, 0, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-09', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-10', 'pulse', FALSE, FALSE, 2, 1, 3, 4, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-11', 'pulse', FALSE, FALSE, 3, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-12', 'pulse', FALSE, FALSE, 3, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-13', 'pulse', FALSE, FALSE, 2, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-14', 'pulse', FALSE, FALSE, 2, 1, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-16', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-17', 'pulse', FALSE, FALSE, 2, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-19', 'pulse', FALSE, FALSE, 2, 1, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-20', 'pulse', FALSE, FALSE, 2, 1, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-21', 'pulse', FALSE, FALSE, 2, 1, 3, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-02-22', 'full', TRUE, FALSE, 2, 1, 1, 2, 'none', 3, 1, 3, 1, 2, 2, 3, 3, 1, 4, 3, 2, 2, 2, 1, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-23', 'pulse', FALSE, FALSE, 3, 2, 2, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-24', 'pulse', FALSE, FALSE, 3, 1, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-25', 'pulse', FALSE, FALSE, 2, 2, 3, 4, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-26', 'pulse', FALSE, FALSE, 1, 1, 2, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-27', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-02-28', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-03-01', 'full', TRUE, FALSE, 2, 2, 3, 4, 'none', 2, 2, 3, 2, 3, 2, 3, 2, 1, 2, 1, 1, 2, 2, 0, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-04', 'pulse', FALSE, FALSE, 3, 4, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-05', 'pulse', FALSE, FALSE, 3, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-06', 'pulse', FALSE, FALSE, 3, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-07', 'pulse', FALSE, FALSE, 3, 2, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-03-08', 'full', TRUE, FALSE, 2, 3, 2, 4, 'none', 3, 2, 2, 1, 2, 4, 4, 3, 1, 3, 2, 2, 2, 2, 2, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-09', 'pulse', FALSE, FALSE, 2, 1, 3, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-10', 'pulse', FALSE, FALSE, 3, 2, 2, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-11', 'pulse', FALSE, FALSE, 1, 2, 3, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-12', 'pulse', FALSE, FALSE, 2, 2, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-13', 'pulse', FALSE, FALSE, 3, 1, 3, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-14', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-03-15', 'full', TRUE, FALSE, 2, 3, 2, 5, 'light', 2, 2, 3, 1, 3, 2, 0, 2, 0, 3, 2, 1, 2, 0, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-16', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-17', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-18', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-20', 'pulse', FALSE, FALSE, 3, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-21', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-03-22', 'full', TRUE, FALSE, 2, 3, 2, 5, 'none', 3, 1, 2, 2, 1, 4, 3, 3, 1, 3, 1, 1, 3, 1, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-23', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-24', 'pulse', FALSE, FALSE, 1, 3, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-25', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-26', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-27', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-28', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-03-29', 'full', TRUE, FALSE, 2, 2, 3, 5, 'none', 2, 0, 2, 2, 3, 3, 2, 2, 1, 3, 0, 2, 3, 1, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-30', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-03-31', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-01', 'pulse', FALSE, FALSE, 3, 2, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-03', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-04', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-04-05', 'full', TRUE, FALSE, 3, 2, 3, 5, 'none', 1, 2, 2, 2, 1, 2, 4, 3, 2, 3, 1, 1, 2, 2, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-06', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-07', 'pulse', FALSE, FALSE, 2, 3, 4, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-08', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-10', 'pulse', FALSE, FALSE, 3, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-04-12', 'full', TRUE, FALSE, 2, 3, 2, 5, 'none', 2, 1, 3, 2, 2, 3, 4, 3, 1, 1, 4, 1, 2, 1, 2, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-13', 'pulse', FALSE, FALSE, 2, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-14', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-16', 'pulse', FALSE, FALSE, 3, 2, 4, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-17', 'pulse', FALSE, FALSE, 3, 3, 3, 7, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-18', 'pulse', FALSE, FALSE, 4, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-04-19', 'full', TRUE, FALSE, 2, 2, 3, 5, 'none', 1, 0, 1, 2, 3, 3, 2, 2, 1, 3, 1, 1, 4, 1, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-20', 'pulse', FALSE, FALSE, 2, 3, 2, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-21', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-22', 'pulse', FALSE, FALSE, 4, 2, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-23', 'pulse', FALSE, FALSE, 3, 2, 4, 6, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-24', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-25', 'pulse', FALSE, FALSE, 3, 2, 4, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-04-26', 'full', TRUE, FALSE, 2, 4, 2, 6, 'none', 2, 0, 1, 2, 3, 0, 3, 2, 0, 2, 2, 0, 1, 2, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-27', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-28', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-29', 'pulse', FALSE, FALSE, 2, 4, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-04-30', 'pulse', FALSE, FALSE, 3, 4, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-01', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-02', 'pulse', FALSE, FALSE, 3, 2, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-05-03', 'full', TRUE, FALSE, 1, 2, 2, 3, 'none', 2, 0, 2, 1, 2, 2, 3, 2, 0, 1, 1, 2, 2, 2, 3, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-04', 'pulse', FALSE, FALSE, 3, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-06', 'pulse', FALSE, FALSE, 1, 3, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-08', 'pulse', FALSE, FALSE, 1, 3, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-05-10', 'full', TRUE, FALSE, 2, 1, 1, 2, 'spotting', 2, 2, 2, 1, 3, 2, 4, 2, 2, 2, 2, 3, 2, 1, 2, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-11', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-12', 'pulse', FALSE, FALSE, 1, 2, 3, 3, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-13', 'pulse', FALSE, FALSE, 1, 1, 3, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-14', 'pulse', FALSE, FALSE, 2, 3, 1, 4, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-15', 'pulse', FALSE, FALSE, 1, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-16', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-05-17', 'full', TRUE, FALSE, 2, 2, 2, 4, 'moderate', 2, 0, 3, 1, 3, 2, 4, 3, 3, 4, 2, 2, 2, 2, 0, 2);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-18', 'pulse', FALSE, FALSE, 1, 1, 1, 1, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-19', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-20', 'pulse', FALSE, FALSE, 1, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-21', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-23', 'pulse', FALSE, FALSE, 2, 2, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-05-24', 'full', TRUE, FALSE, 2, 2, 2, 4, 'spotting', 2, 1, 3, 1, 3, 1, 3, 2, 3, 2, 0, 1, 4, 3, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-25', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-26', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-27', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-28', 'pulse', FALSE, FALSE, 1, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-29', 'pulse', FALSE, FALSE, 3, 3, 1, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-05-30', 'pulse', FALSE, FALSE, 3, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-05-31', 'full', TRUE, FALSE, 1, 2, 1, 3, 'spotting', 2, 0, 2, 1, 2, 2, 3, 3, 0, 3, 1, 2, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-02', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-03', 'pulse', FALSE, FALSE, 4, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-04', 'pulse', FALSE, FALSE, 2, 2, 3, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-05', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-06', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-06-07', 'full', TRUE, FALSE, 4, 1, 3, 5, 'none', 1, 0, 1, 0, 2, 2, 3, 0, 0, 2, 2, 2, 3, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-08', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-09', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-10', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-11', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-12', 'pulse', FALSE, FALSE, 2, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-13', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-06-14', 'full', TRUE, FALSE, 2, 3, 3, 6, 'none', 1, 1, 2, 1, 2, 2, 4, 2, 1, 1, 0, 1, 2, 1, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-15', 'pulse', FALSE, FALSE, 2, 2, 3, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-16', 'pulse', FALSE, FALSE, 2, 3, 4, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-17', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-18', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-19', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-20', 'pulse', FALSE, FALSE, 4, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-06-21', 'full', TRUE, FALSE, 3, 2, 2, 4, 'spotting', 2, 1, 1, 2, 1, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-22', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-23', 'pulse', FALSE, FALSE, 3, 2, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-25', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-26', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-27', 'pulse', FALSE, FALSE, 3, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-06-28', 'full', TRUE, FALSE, 3, 3, 3, 6, 'none', 2, 2, 3, 1, 2, 2, 2, 1, 0, 3, 1, 1, 2, 1, 0, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-29', 'pulse', FALSE, FALSE, 3, 3, 4, 6, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-06-30', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-02', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-03', 'pulse', FALSE, FALSE, 4, 4, 4, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-04', 'pulse', FALSE, FALSE, 4, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-07-05', 'full', TRUE, FALSE, 3, 2, 3, 6, 'none', 1, 1, 2, 1, 2, 0, 2, 2, 2, 1, 1, 1, 1, 0, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-06', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-07', 'pulse', FALSE, FALSE, 3, 4, 4, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-08', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-10', 'pulse', FALSE, FALSE, 2, 4, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-07-12', 'full', TRUE, FALSE, 3, 4, 3, 7, 'none', 3, 1, 2, 0, 2, 1, 2, 3, 0, 1, 1, 0, 2, 1, 0, 2);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-13', 'pulse', FALSE, FALSE, 3, 3, 4, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-14', 'pulse', FALSE, FALSE, 3, 4, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-16', 'pulse', FALSE, FALSE, 4, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-17', 'pulse', FALSE, FALSE, 3, 4, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-07-19', 'full', TRUE, FALSE, 3, 3, 4, 7, 'none', 2, 0, 1, 1, 1, 1, 2, 2, 0, 1, 0, 0, 2, 1, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-20', 'pulse', FALSE, FALSE, 3, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-21', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-23', 'pulse', FALSE, FALSE, 3, 4, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-24', 'pulse', FALSE, FALSE, 3, 4, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-25', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2026-07-26', 'full', TRUE, FALSE, 4, 3, 2, 6, 'none', 1, 1, 1, 1, 2, 1, 2, 2, 0, 2, 0, 1, 2, 2, 0, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-28', 'pulse', FALSE, FALSE, 3, 4, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-29', 'pulse', FALSE, FALSE, 3, 4, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-30', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-07-31', 'pulse', FALSE, FALSE, 3, 4, 3, 6, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2026-08-01', 'pulse', FALSE, FALSE, 3, 3, 4, 7, 'none');

  -- ── Medication administrations ──
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-01T08:07:00-07:00', '2026-01-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-01T21:31:00-07:00', '2026-01-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-02T23:07:00-07:00', '2026-01-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-03T22:45:00-07:00', '2026-01-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-04T23:18:00-07:00', '2026-01-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-05T10:12:00-07:00', '2026-01-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-05T21:28:00-07:00', '2026-01-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-06T23:28:00-07:00', '2026-01-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-08T09:42:00-07:00', '2026-01-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-08T21:35:00-07:00', '2026-01-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-09T22:54:00-07:00', '2026-01-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-10T23:59:00-07:00', '2026-01-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-11T21:50:00-07:00', '2026-01-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-12T08:07:00-07:00', '2026-01-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-13T21:50:00-07:00', '2026-01-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-14T22:35:00-07:00', '2026-01-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-15T10:51:00-07:00', '2026-01-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-16T21:04:00-07:00', '2026-01-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-17T23:46:00-07:00', '2026-01-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-18T22:49:00-07:00', '2026-01-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-19T07:08:00-07:00', '2026-01-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-20T22:29:00-07:00', '2026-01-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-21T22:08:00-07:00', '2026-01-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-22T08:49:00-07:00', '2026-01-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-23T21:53:00-07:00', '2026-01-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-24T21:19:00-07:00', '2026-01-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-25T22:59:00-07:00', '2026-01-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-26T09:33:00-07:00', '2026-01-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-27T22:12:00-07:00', '2026-01-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-28T23:17:00-07:00', '2026-01-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-01-29T09:39:00-07:00', '2026-01-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-29T23:41:00-07:00', '2026-01-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-30T23:09:00-07:00', '2026-01-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-01-31T23:46:00-07:00', '2026-01-31');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-02T07:52:00-07:00', '2026-02-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-02T21:02:00-07:00', '2026-02-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-04T22:41:00-07:00', '2026-02-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-05T10:39:00-07:00', '2026-02-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-05T22:56:00-07:00', '2026-02-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-06T22:41:00-07:00', '2026-02-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-08T23:25:00-07:00', '2026-02-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-09T07:44:00-07:00', '2026-02-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-09T22:26:00-07:00', '2026-02-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-10T21:21:00-07:00', '2026-02-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-11T22:55:00-07:00', '2026-02-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-12T09:25:00-07:00', '2026-02-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-12T22:32:00-07:00', '2026-02-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-13T22:15:00-07:00', '2026-02-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-14T22:28:00-07:00', '2026-02-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-15T21:03:00-07:00', '2026-02-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-16T10:55:00-07:00', '2026-02-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-16T21:55:00-07:00', '2026-02-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-18T23:46:00-07:00', '2026-02-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-19T08:31:00-07:00', '2026-02-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-20T22:31:00-07:00', '2026-02-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-20T09:32:00-07:00', '2026-02-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-21T21:13:00-07:00', '2026-02-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-21T06:03:00-07:00', '2026-02-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-22T23:56:00-07:00', '2026-02-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-22T09:18:00-07:00', '2026-02-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-02-23T07:27:00-07:00', '2026-02-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-23T22:46:00-07:00', '2026-02-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-23T09:23:00-07:00', '2026-02-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-24T21:36:00-07:00', '2026-02-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-24T08:35:00-07:00', '2026-02-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-25T22:32:00-07:00', '2026-02-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-25T08:52:00-07:00', '2026-02-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-26T21:08:00-07:00', '2026-02-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-27T22:35:00-07:00', '2026-02-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-02-28T21:38:00-07:00', '2026-02-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-02-28T06:02:00-07:00', '2026-02-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-01T23:21:00-07:00', '2026-03-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-01T09:09:00-07:00', '2026-03-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-02T08:20:00-07:00', '2026-03-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-02T09:39:00-07:00', '2026-03-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-03T22:37:00-07:00', '2026-03-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-03T09:45:00-07:00', '2026-03-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-04T22:52:00-07:00', '2026-03-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-04T08:43:00-07:00', '2026-03-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-05T10:37:00-07:00', '2026-03-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-05T23:55:00-07:00', '2026-03-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-05T06:38:00-07:00', '2026-03-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-06T23:50:00-07:00', '2026-03-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-07T21:46:00-07:00', '2026-03-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-07T09:10:00-07:00', '2026-03-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-08T23:39:00-07:00', '2026-03-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-08T09:09:00-07:00', '2026-03-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-09T08:02:00-07:00', '2026-03-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-09T23:07:00-07:00', '2026-03-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-09T09:20:00-07:00', '2026-03-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-10T22:44:00-07:00', '2026-03-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-10T09:55:00-07:00', '2026-03-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-11T23:03:00-07:00', '2026-03-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-11T07:35:00-07:00', '2026-03-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-12T10:33:00-07:00', '2026-03-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-12T21:29:00-07:00', '2026-03-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-13T22:43:00-07:00', '2026-03-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-13T08:39:00-07:00', '2026-03-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-14T21:17:00-07:00', '2026-03-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-14T07:19:00-07:00', '2026-03-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-15T23:13:00-07:00', '2026-03-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-15T09:20:00-07:00', '2026-03-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-16T09:18:00-07:00', '2026-03-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-16T23:34:00-07:00', '2026-03-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-16T09:52:00-07:00', '2026-03-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-17T21:18:00-07:00', '2026-03-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-17T06:22:00-07:00', '2026-03-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-18T09:13:00-07:00', '2026-03-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-19T09:59:00-07:00', '2026-03-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-19T22:08:00-07:00', '2026-03-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-19T07:15:00-07:00', '2026-03-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-20T23:14:00-07:00', '2026-03-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-20T06:06:00-07:00', '2026-03-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-21T23:30:00-07:00', '2026-03-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-21T07:00:00-07:00', '2026-03-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-23T10:30:00-07:00', '2026-03-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-23T22:20:00-07:00', '2026-03-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-23T06:58:00-07:00', '2026-03-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-24T23:36:00-07:00', '2026-03-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-24T06:58:00-07:00', '2026-03-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-25T07:59:00-07:00', '2026-03-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-26T09:11:00-07:00', '2026-03-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-29T23:38:00-07:00', '2026-03-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-29T08:18:00-07:00', '2026-03-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-03-30T10:56:00-07:00', '2026-03-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-03-31T21:51:00-07:00', '2026-03-31');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-03-31T07:46:00-07:00', '2026-03-31');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-01T22:45:00-07:00', '2026-04-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-01T08:50:00-07:00', '2026-04-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-02T08:11:00-07:00', '2026-04-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-02T23:57:00-07:00', '2026-04-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-02T09:32:00-07:00', '2026-04-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-03T22:42:00-07:00', '2026-04-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-03T07:30:00-07:00', '2026-04-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-04T21:00:00-07:00', '2026-04-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-04T07:28:00-07:00', '2026-04-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-05T22:19:00-07:00', '2026-04-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-05T06:16:00-07:00', '2026-04-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-06T08:03:00-07:00', '2026-04-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-06T22:19:00-07:00', '2026-04-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-06T08:44:00-07:00', '2026-04-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-07T22:23:00-07:00', '2026-04-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-07T07:08:00-07:00', '2026-04-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-08T22:47:00-07:00', '2026-04-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-09T10:48:00-07:00', '2026-04-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-09T23:52:00-07:00', '2026-04-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-09T07:43:00-07:00', '2026-04-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-10T21:33:00-07:00', '2026-04-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-10T08:04:00-07:00', '2026-04-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-11T07:36:00-07:00', '2026-04-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-12T21:20:00-07:00', '2026-04-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-13T08:45:00-07:00', '2026-04-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-13T21:57:00-07:00', '2026-04-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-13T06:29:00-07:00', '2026-04-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-14T22:29:00-07:00', '2026-04-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-14T09:43:00-07:00', '2026-04-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-15T23:01:00-07:00', '2026-04-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-15T06:47:00-07:00', '2026-04-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-16T07:02:00-07:00', '2026-04-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-16T23:04:00-07:00', '2026-04-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-16T06:59:00-07:00', '2026-04-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-18T22:26:00-07:00', '2026-04-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-18T07:49:00-07:00', '2026-04-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-19T23:41:00-07:00', '2026-04-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-20T10:28:00-07:00', '2026-04-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-20T22:24:00-07:00', '2026-04-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-20T07:41:00-07:00', '2026-04-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-21T21:11:00-07:00', '2026-04-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-22T21:46:00-07:00', '2026-04-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-23T07:19:00-07:00', '2026-04-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-23T23:34:00-07:00', '2026-04-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-23T09:52:00-07:00', '2026-04-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-24T22:22:00-07:00', '2026-04-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-24T07:59:00-07:00', '2026-04-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-25T21:02:00-07:00', '2026-04-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-25T09:39:00-07:00', '2026-04-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-26T21:15:00-07:00', '2026-04-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-26T06:38:00-07:00', '2026-04-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-27T07:15:00-07:00', '2026-04-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-27T22:28:00-07:00', '2026-04-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-27T07:48:00-07:00', '2026-04-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-28T21:08:00-07:00', '2026-04-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-28T08:14:00-07:00', '2026-04-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-29T23:36:00-07:00', '2026-04-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-29T08:15:00-07:00', '2026-04-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-04-30T08:42:00-07:00', '2026-04-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-04-30T22:19:00-07:00', '2026-04-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-04-30T07:40:00-07:00', '2026-04-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-01T23:31:00-07:00', '2026-05-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-01T08:41:00-07:00', '2026-05-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-02T23:20:00-07:00', '2026-05-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-02T09:09:00-07:00', '2026-05-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-03T21:48:00-07:00', '2026-05-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-03T07:54:00-07:00', '2026-05-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-04T08:51:00-07:00', '2026-05-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-04T21:35:00-07:00', '2026-05-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-04T09:35:00-07:00', '2026-05-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-05T22:15:00-07:00', '2026-05-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-05T08:41:00-07:00', '2026-05-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-06T22:54:00-07:00', '2026-05-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-06T07:03:00-07:00', '2026-05-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-07T07:55:00-07:00', '2026-05-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-07T23:46:00-07:00', '2026-05-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-07T07:30:00-07:00', '2026-05-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-08T22:19:00-07:00', '2026-05-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-09T21:47:00-07:00', '2026-05-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-09T09:58:00-07:00', '2026-05-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-10T23:45:00-07:00', '2026-05-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-10T07:35:00-07:00', '2026-05-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-11T09:24:00-07:00', '2026-05-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-11T23:22:00-07:00', '2026-05-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-11T08:32:00-07:00', '2026-05-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-12T09:48:00-07:00', '2026-05-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-13T21:23:00-07:00', '2026-05-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-13T06:36:00-07:00', '2026-05-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-14T08:01:00-07:00', '2026-05-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-14T23:37:00-07:00', '2026-05-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-14T08:09:00-07:00', '2026-05-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-15T21:24:00-07:00', '2026-05-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-15T07:31:00-07:00', '2026-05-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-16T23:21:00-07:00', '2026-05-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-16T09:46:00-07:00', '2026-05-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-17T22:29:00-07:00', '2026-05-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-17T08:10:00-07:00', '2026-05-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-18T10:11:00-07:00', '2026-05-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-18T06:33:00-07:00', '2026-05-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-19T21:52:00-07:00', '2026-05-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-19T06:26:00-07:00', '2026-05-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-20T23:14:00-07:00', '2026-05-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-20T07:00:00-07:00', '2026-05-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-21T10:23:00-07:00', '2026-05-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-21T23:42:00-07:00', '2026-05-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-22T06:00:00-07:00', '2026-05-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-23T22:00:00-07:00', '2026-05-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-23T08:34:00-07:00', '2026-05-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-24T09:51:00-07:00', '2026-05-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-25T21:33:00-07:00', '2026-05-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-25T07:39:00-07:00', '2026-05-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-26T22:17:00-07:00', '2026-05-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-26T06:23:00-07:00', '2026-05-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-27T07:44:00-07:00', '2026-05-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-05-28T07:41:00-07:00', '2026-05-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-28T06:05:00-07:00', '2026-05-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-29T22:35:00-07:00', '2026-05-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-29T06:44:00-07:00', '2026-05-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-05-30T22:54:00-07:00', '2026-05-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-05-30T08:36:00-07:00', '2026-05-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-01T07:14:00-07:00', '2026-06-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-01T23:56:00-07:00', '2026-06-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-01T08:02:00-07:00', '2026-06-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-02T08:57:00-07:00', '2026-06-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-03T23:02:00-07:00', '2026-06-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-03T08:01:00-07:00', '2026-06-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-04T23:52:00-07:00', '2026-06-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-04T06:19:00-07:00', '2026-06-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-05T21:36:00-07:00', '2026-06-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-05T09:43:00-07:00', '2026-06-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-06T07:50:00-07:00', '2026-06-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-07T08:03:00-07:00', '2026-06-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-08T08:53:00-07:00', '2026-06-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-08T23:49:00-07:00', '2026-06-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-08T09:49:00-07:00', '2026-06-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-09T23:17:00-07:00', '2026-06-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-09T09:31:00-07:00', '2026-06-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-10T23:24:00-07:00', '2026-06-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-10T09:05:00-07:00', '2026-06-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-11T09:51:00-07:00', '2026-06-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-11T21:05:00-07:00', '2026-06-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-11T09:45:00-07:00', '2026-06-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-12T21:47:00-07:00', '2026-06-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-12T08:06:00-07:00', '2026-06-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-13T22:28:00-07:00', '2026-06-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-13T08:06:00-07:00', '2026-06-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-14T21:27:00-07:00', '2026-06-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-14T09:06:00-07:00', '2026-06-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-15T09:35:00-07:00', '2026-06-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-15T23:50:00-07:00', '2026-06-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-15T09:00:00-07:00', '2026-06-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-16T22:49:00-07:00', '2026-06-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-16T07:36:00-07:00', '2026-06-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-17T23:24:00-07:00', '2026-06-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-17T08:19:00-07:00', '2026-06-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-18T08:04:00-07:00', '2026-06-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-18T22:26:00-07:00', '2026-06-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-18T06:23:00-07:00', '2026-06-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-19T21:46:00-07:00', '2026-06-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-19T07:29:00-07:00', '2026-06-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-20T22:00:00-07:00', '2026-06-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-21T23:24:00-07:00', '2026-06-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-21T08:28:00-07:00', '2026-06-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-22T08:19:00-07:00', '2026-06-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-22T23:12:00-07:00', '2026-06-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-22T07:25:00-07:00', '2026-06-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-23T09:36:00-07:00', '2026-06-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-24T22:24:00-07:00', '2026-06-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-24T09:23:00-07:00', '2026-06-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-25T08:37:00-07:00', '2026-06-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-25T06:46:00-07:00', '2026-06-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-26T23:13:00-07:00', '2026-06-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-26T08:53:00-07:00', '2026-06-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-27T22:43:00-07:00', '2026-06-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-27T08:15:00-07:00', '2026-06-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-28T21:45:00-07:00', '2026-06-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-28T09:04:00-07:00', '2026-06-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-06-29T10:37:00-07:00', '2026-06-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-29T23:59:00-07:00', '2026-06-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-06-30T23:02:00-07:00', '2026-06-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-06-30T08:44:00-07:00', '2026-06-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-01T06:06:00-07:00', '2026-07-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-02T09:10:00-07:00', '2026-07-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-02T21:36:00-07:00', '2026-07-02');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-03T22:48:00-07:00', '2026-07-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-03T09:06:00-07:00', '2026-07-03');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-04T22:14:00-07:00', '2026-07-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-04T07:28:00-07:00', '2026-07-04');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-05T22:49:00-07:00', '2026-07-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-05T07:22:00-07:00', '2026-07-05');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-06T22:26:00-07:00', '2026-07-06');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-07T23:09:00-07:00', '2026-07-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-07T08:29:00-07:00', '2026-07-07');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-08T23:30:00-07:00', '2026-07-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-08T06:28:00-07:00', '2026-07-08');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-09T10:20:00-07:00', '2026-07-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-09T21:51:00-07:00', '2026-07-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-09T06:54:00-07:00', '2026-07-09');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-10T21:43:00-07:00', '2026-07-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-10T07:33:00-07:00', '2026-07-10');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-11T21:21:00-07:00', '2026-07-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-11T09:14:00-07:00', '2026-07-11');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-12T23:11:00-07:00', '2026-07-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-12T09:25:00-07:00', '2026-07-12');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-13T08:28:00-07:00', '2026-07-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-13T22:00:00-07:00', '2026-07-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-13T07:17:00-07:00', '2026-07-13');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-14T21:36:00-07:00', '2026-07-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-14T07:23:00-07:00', '2026-07-14');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-15T22:07:00-07:00', '2026-07-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-15T09:33:00-07:00', '2026-07-15');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-16T22:39:00-07:00', '2026-07-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-16T06:22:00-07:00', '2026-07-16');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-17T22:39:00-07:00', '2026-07-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-17T08:58:00-07:00', '2026-07-17');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-18T21:43:00-07:00', '2026-07-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-18T06:15:00-07:00', '2026-07-18');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-19T21:23:00-07:00', '2026-07-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-19T09:26:00-07:00', '2026-07-19');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-20T10:27:00-07:00', '2026-07-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-20T23:34:00-07:00', '2026-07-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-20T07:35:00-07:00', '2026-07-20');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-21T22:08:00-07:00', '2026-07-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-21T09:39:00-07:00', '2026-07-21');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-22T22:00:00-07:00', '2026-07-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-22T07:52:00-07:00', '2026-07-22');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-23T10:26:00-07:00', '2026-07-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-23T22:45:00-07:00', '2026-07-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-23T09:10:00-07:00', '2026-07-23');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-24T21:50:00-07:00', '2026-07-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-24T08:02:00-07:00', '2026-07-24');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-25T23:18:00-07:00', '2026-07-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-25T09:36:00-07:00', '2026-07-25');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-26T22:35:00-07:00', '2026-07-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-26T06:17:00-07:00', '2026-07-26');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-27T09:34:00-07:00', '2026-07-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-27T21:48:00-07:00', '2026-07-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-27T07:27:00-07:00', '2026-07-27');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-28T23:48:00-07:00', '2026-07-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-28T06:28:00-07:00', '2026-07-28');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-29T21:28:00-07:00', '2026-07-29');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_estradiol_id, '2026-07-30T08:13:00-07:00', '2026-07-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-30T23:44:00-07:00', '2026-07-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-30T09:10:00-07:00', '2026-07-30');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-07-31T21:52:00-07:00', '2026-07-31');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-07-31T06:36:00-07:00', '2026-07-31');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_progesterone_id, '2026-08-01T22:38:00-07:00', '2026-08-01');
  INSERT INTO medication_administrations (user_id, medication_id, taken_at, local_date)
  VALUES (v_user_id, v_testosterone_id, '2026-08-01T08:45:00-07:00', '2026-08-01');

  -- ── Monthly lab draws ──
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-01-14', TRUE, '08:30', 'Quest Diagnostics', 17.8, 0.3, 67.7, 33.7, 11.9, 1.1, 3.0, 21.6, 31.8);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-02-18', TRUE, '08:30', 'Quest Diagnostics', 29.6, 8.1, 44.9, 30.6, 14.3, 1.3, 2.7, 24.7, 28.8);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-03-13', TRUE, '08:30', 'Quest Diagnostics', 43.4, 11.8, 36.2, 24.7, 26.1, 2.6, 2.5, 28.9, 34.3);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-04-14', TRUE, '08:30', 'Quest Diagnostics', 61.4, 13.2, 30.5, 18.2, 33.3, 3.5, 2.2, 34.2, 39.5);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-05-17', TRUE, '08:30', 'Quest Diagnostics', 47.5, 11.2, 32.8, 21.8, 31.0, 3.2, 2.3, 38.3, 40.6);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-06-16', TRUE, '08:30', 'Quest Diagnostics', 76.0, 16.8, 20.4, 17.1, 36.0, 4.3, 2.0, 40.2, 47.6);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2026-07-18', TRUE, '08:30', 'Quest Diagnostics', 80.4, 18.8, 18.9, 14.0, 46.6, 4.5, 2.0, 43.7, 55.7);

  RAISE NOTICE 'Test data inserted successfully for %', v_user_id;

END $$;