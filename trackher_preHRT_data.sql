-- ============================================================
-- TrackHer SUPPLEMENTAL Pre-HRT Data (Aug–Dec 2025)
-- Append to existing Jan–Aug 2026 data
-- ============================================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'farleysfinest@gmail.com';
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User farleysfinest@gmail.com not found';
  END IF;

  -- ── Pre-HRT check-ins (Aug–Dec 2025) ──
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-01', 'pulse', FALSE, FALSE, 3, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-02', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-08-03', 'full', TRUE, FALSE, 2, 3, 3, 5, 'none', 2, 0, 2, 2, 2, 2, 3, 1, 1, 2, 2, 2, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-04', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-06', 'pulse', FALSE, FALSE, 3, 2, 4, 6, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-07', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-08', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-09', 'pulse', FALSE, FALSE, 4, 2, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-08-10', 'full', TRUE, FALSE, 3, 2, 2, 4, 'none', 2, 0, 2, 1, 2, 2, 3, 3, 1, 2, 3, 1, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-12', 'pulse', FALSE, FALSE, 2, 2, 4, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-13', 'pulse', FALSE, FALSE, 2, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-14', 'pulse', FALSE, FALSE, 3, 3, 2, 6, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-15', 'pulse', FALSE, FALSE, 2, 4, 2, 5, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-16', 'pulse', FALSE, FALSE, 2, 4, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-08-17', 'full', TRUE, FALSE, 3, 3, 1, 5, 'none', 3, 1, 2, 1, 2, 2, 3, 2, 0, 4, 2, 1, 1, 2, 1, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-18', 'pulse', FALSE, FALSE, 3, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-19', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-20', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-21', 'pulse', FALSE, FALSE, 3, 3, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-25', 'pulse', FALSE, FALSE, 3, 1, 2, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-26', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-27', 'pulse', FALSE, FALSE, 3, 1, 3, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-29', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-08-30', 'pulse', FALSE, FALSE, 4, 4, 2, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-08-31', 'full', TRUE, FALSE, 3, 3, 1, 5, 'light', 1, 1, 2, 1, 2, 3, 3, 1, 1, 4, 2, 1, 1, 0, 0, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-01', 'pulse', FALSE, FALSE, 3, 2, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-02', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-03', 'pulse', FALSE, FALSE, 2, 3, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-04', 'pulse', FALSE, FALSE, 2, 3, 2, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-05', 'pulse', FALSE, FALSE, 2, 3, 2, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-06', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-08', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-09', 'pulse', FALSE, FALSE, 2, 1, 3, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-10', 'pulse', FALSE, FALSE, 1, 1, 3, 4, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-11', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-12', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-13', 'pulse', FALSE, FALSE, 2, 2, 1, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-16', 'pulse', FALSE, FALSE, 3, 2, 2, 5, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-17', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-18', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-19', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-09-21', 'full', TRUE, FALSE, 2, 3, 3, 6, 'moderate', 3, 0, 2, 2, 3, 2, 1, 2, 1, 3, 2, 2, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-23', 'pulse', FALSE, FALSE, 2, 4, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-24', 'pulse', FALSE, FALSE, 2, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-25', 'pulse', FALSE, FALSE, 2, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-26', 'pulse', FALSE, FALSE, 3, 3, 1, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-27', 'pulse', FALSE, FALSE, 3, 3, 3, 7, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-09-28', 'full', TRUE, FALSE, 2, 2, 1, 3, 'heavy', 3, 0, 3, 2, 2, 2, 3, 2, 1, 4, 1, 2, 3, 1, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-29', 'pulse', FALSE, FALSE, 3, 2, 2, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-09-30', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-01', 'pulse', FALSE, FALSE, 2, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-02', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-03', 'pulse', FALSE, FALSE, 1, 2, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-04', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-10-05', 'full', TRUE, FALSE, 1, 2, 2, 3, 'none', 2, 1, 2, 2, 3, 3, 4, 3, 1, 3, 2, 3, 3, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-06', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-07', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-08', 'pulse', FALSE, FALSE, 2, 1, 2, 4, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-10', 'pulse', FALSE, FALSE, 2, 3, 3, 6, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-11', 'pulse', FALSE, FALSE, 1, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-10-12', 'full', TRUE, FALSE, 2, 1, 2, 3, 'none', 3, 1, 3, 3, 3, 3, 4, 3, 1, 3, 3, 3, 3, 3, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-13', 'pulse', FALSE, FALSE, 1, 2, 3, 5, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-14', 'pulse', FALSE, FALSE, 2, 1, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-15', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-16', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-17', 'pulse', FALSE, FALSE, 2, 2, 2, 5, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-18', 'pulse', FALSE, FALSE, 1, 1, 2, 3, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-10-19', 'full', TRUE, FALSE, 2, 2, 2, 3, 'none', 3, 1, 3, 2, 4, 4, 4, 3, 2, 4, 2, 2, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-20', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-22', 'pulse', FALSE, FALSE, 1, 1, 2, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-27', 'pulse', FALSE, FALSE, 1, 1, 1, 1, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-28', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-29', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-30', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-10-31', 'pulse', FALSE, FALSE, 2, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-01', 'pulse', FALSE, FALSE, 3, 2, 1, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-11-02', 'full', TRUE, FALSE, 1, 2, 2, 3, 'heavy', 3, 2, 3, 2, 3, 3, 3, 4, 0, 2, 4, 2, 3, 3, 2, 2);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-03', 'pulse', FALSE, FALSE, 1, 3, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-04', 'pulse', FALSE, FALSE, 1, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-05', 'pulse', FALSE, FALSE, 2, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-06', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-07', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-08', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-11-09', 'full', TRUE, FALSE, 1, 1, 1, 2, 'light', 2, 1, 4, 2, 3, 3, 4, 3, 2, 4, 2, 1, 3, 2, 2, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-10', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-11', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-13', 'pulse', FALSE, FALSE, 1, 1, 2, 2, 'heavy');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-14', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-15', 'pulse', FALSE, FALSE, 2, 3, 1, 4, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-17', 'pulse', FALSE, FALSE, 2, 3, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-18', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-20', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'moderate');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-21', 'pulse', FALSE, FALSE, 1, 3, 1, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-22', 'pulse', FALSE, FALSE, 1, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-11-23', 'full', TRUE, FALSE, 2, 1, 1, 3, 'none', 3, 1, 3, 2, 3, 3, 4, 3, 1, 4, 3, 2, 3, 3, 2, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-24', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-25', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'light');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-27', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-11-29', 'pulse', FALSE, FALSE, 1, 2, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-11-30', 'full', TRUE, FALSE, 2, 1, 3, 4, 'none', 3, 2, 4, 2, 4, 3, 4, 3, 1, 1, 0, 1, 4, 1, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-01', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-04', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-05', 'pulse', FALSE, FALSE, 2, 2, 1, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-12-07', 'full', TRUE, FALSE, 2, 2, 2, 5, 'none', 4, 0, 3, 1, 4, 2, 4, 3, 1, 2, 1, 1, 2, 2, 1, 1);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-08', 'pulse', FALSE, FALSE, 1, 3, 2, 4, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-10', 'pulse', FALSE, FALSE, 2, 2, 1, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-11', 'pulse', FALSE, FALSE, 3, 1, 3, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-12', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-13', 'pulse', FALSE, FALSE, 1, 1, 2, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-12-14', 'full', TRUE, FALSE, 1, 2, 1, 4, 'none', 3, 2, 4, 3, 4, 3, 4, 4, 1, 3, 2, 1, 3, 1, 1, 2);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-15', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-16', 'pulse', FALSE, FALSE, 2, 2, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-17', 'pulse', FALSE, FALSE, 1, 2, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-18', 'pulse', FALSE, FALSE, 2, 2, 2, 4, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-20', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'spotting');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-12-21', 'full', TRUE, FALSE, 1, 1, 1, 1, 'none', 4, 1, 3, 2, 4, 4, 4, 4, 2, 4, 3, 2, 4, 3, 1, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-22', 'pulse', FALSE, FALSE, 2, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-23', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-24', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-25', 'pulse', FALSE, FALSE, 1, 1, 1, 3, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-27', 'pulse', FALSE, FALSE, 1, 1, 1, 2, 'none');
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow, hot_flashes, heart_discomfort, sleep_problems, depressed_mood, irritability, anxiety, exhaustion, sexual_problems, bladder_problems, vaginal_dryness, joint_muscle_pain, dry_itchy_skin, brain_fog, irregular_periods, heavy_bleeding, misophonia)
  VALUES (v_user_id, '2025-12-28', 'full', TRUE, FALSE, 2, 2, 1, 3, 'spotting', 4, 1, 4, 4, 4, 3, 4, 3, 0, 3, 2, 1, 3, 2, 1, 0);
  INSERT INTO symptom_checkins (user_id, checkin_date, checkin_type, mrs_complete, is_backdated, energy_level, mood_level, sleep_quality, overall_wellbeing, bleeding_flow)
  VALUES (v_user_id, '2025-12-29', 'pulse', FALSE, FALSE, 2, 1, 1, 2, 'none');

  -- ── Pre-HRT lab draws ──
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2025-08-12', TRUE, '08:30', 'Quest Diagnostics', 36.7, 0.8, 42.7, 28.9, 15.3, 1.4, 2.3, 28.7, 34.9);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2025-10-15', TRUE, '08:30', 'Quest Diagnostics', 22.2, 0.4, 57.4, 34.5, 12.9, 1.1, 2.6, 25.0, 28.6);
  INSERT INTO lab_results (user_id, draw_date, fasting, draw_time, lab_name, estradiol, progesterone, fsh, lh, total_testosterone, free_testosterone, tsh, vitamin_d, ferritin)
  VALUES (v_user_id, '2025-12-13', TRUE, '08:30', 'Quest Diagnostics', 14.4, 0.2, 61.7, 39.1, 11.3, 1.0, 2.9, 21.5, 25.7);

  RAISE NOTICE 'Pre-HRT data (Aug-Dec 2025) inserted for %', v_user_id;

END $$;