import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DateOfBirthInput } from '../ui/DateOfBirthInput';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';
import { TimezoneSelect } from '../ui/TimezoneSelect';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { getLocalDateISO, getResolvedTimezone } from '../../utils/checkinHelpers';
import { getActiveTimezone, isValidTimeZone } from '../../utils/localDate';
import { deriveUterusAnswer, uterusAnswerToValue, type UterusAnswer } from '../../utils/uterusAnswer';
import {
  AVATAR_STAMP_KEY,
  removeProfileAvatarObject,
  uploadProfileAvatar,
} from '../../utils/profileAvatar';
import { Camera, Trash2 } from 'lucide-react';
import { useProfileAvatarUrl } from '../../hooks/useProfileAvatarUrl';
import { setUiValue } from '../../lib/uiState';

const DAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function ProfileSettingsCard() {
  const { user } = useAuth();
  const { profile, update, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [uterusAnswer, setUterusAnswer] = useState<UterusAnswer | null>(
    deriveUterusAnswer(profile),
  );
  const [preferredTimezone, setPreferredTimezone] = useState(
    profile?.timezone ?? getActiveTimezone(),
  );
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [checkinDay, setCheckinDay] = useState<number | null>(profile?.checkin_day ?? null);
  const [nextAppointmentDate, setNextAppointmentDate] = useState(
    profile?.next_appointment_date ?? '',
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const timezone = getResolvedTimezone(profile?.timezone);
  const todayStr = getLocalDateISO(timezone);
  const appointmentIsPast = !!nextAppointmentDate && nextAppointmentDate < todayStr;
  const avatarUrl = useProfileAvatarUrl();

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setUterusAnswer(deriveUterusAnswer(profile));
      setPreferredTimezone(profile.timezone ?? getActiveTimezone());
      setDateOfBirth(profile.date_of_birth ?? '');
      setCheckinDay(profile.checkin_day ?? null);
      setNextAppointmentDate(profile.next_appointment_date ?? '');
    }
  }, [profile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uterusAnswer === null) {
      setProfileError('Please answer the uterus question — not sure is a valid answer.');
      return;
    }
    if (!isValidTimeZone(preferredTimezone)) {
      setProfileError('Please select a valid time zone.');
      return;
    }
    setProfileError(null);
    const confirmedAt = new Date().toISOString();
    const result = await update({
      display_name: displayName,
      has_uterus: uterusAnswerToValue(uterusAnswer),
      has_uterus_confirmed_at: confirmedAt,
      timezone: preferredTimezone,
      timezone_confirmed_at: confirmedAt,
      date_of_birth: dateOfBirth || null,
      // Backward compatibility: this stays for recall-period labels.
      checkin_frequency: 'weekly',
      // Convention: 0 = Sunday ... 6 = Saturday (matches JS Date#getDay()).
      checkin_day: checkinDay,
      next_appointment_date: nextAppointmentDate || null,
    });
    if (result.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } else {
      setProfileError(result.error ?? 'Could not save your profile.');
    }
  };

  // The stamp goes through setUiValue (the merge_ui_state RPC) rather than a
  // whole-column write, so saving a picture cannot clobber tooltip and banner
  // keys another device wrote to ui_state since this client last fetched.
  const handleAvatarFile = async (file: File | undefined) => {
    if (!file || !user) return;
    setAvatarError(null);
    setIsAvatarSaving(true);
    try {
      const stamp = await uploadProfileAvatar(user.id, file);
      setUiValue(AVATAR_STAMP_KEY, stamp);
    } catch (error) {
      setAvatarError(
        error instanceof Error ? error.message : 'Could not save your profile picture.',
      );
    } finally {
      setIsAvatarSaving(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setAvatarError(null);
    setIsAvatarSaving(true);
    const { error } = await removeProfileAvatarObject(user.id);
    if (error) {
      setAvatarError('Could not remove your profile picture.');
    } else {
      setUiValue(AVATAR_STAMP_KEY, null);
    }
    setIsAvatarSaving(false);
  };

  return (
    <Card>
      <h2 className="font-display text-xl text-sage-800">Profile</h2>
      <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-sage-700">Profile picture</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sage-500 text-lg font-medium text-on-accent">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Current profile" className="h-full w-full object-cover" />
              ) : (
                (displayName.trim().charAt(0) || user?.email?.charAt(0) || '?').toUpperCase()
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void handleAvatarFile(event.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => avatarInputRef.current?.click()}
              isLoading={isAvatarSaving}
              loadingText="Saving…"
            >
              <Camera className="h-4 w-4" aria-hidden />
              {avatarUrl ? 'Change picture' : 'Add picture'}
            </Button>
            {avatarUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void handleAvatarRemove()}
                disabled={isAvatarSaving}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-sage-500">
            TrackHer crops the center of your picture into the account circle.
          </p>
          {avatarError && <p className="mt-2 text-sm text-danger">{avatarError}</p>}
        </div>
        <Input
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {/*
          Read-only on purpose. This used to be a free-pick dropdown writing `menopause_stage`,
          a column nothing clinical reads — the provider report, the insight engine and the
          postmenopausal-bleeding check all key off `straw_stage`, which onboarding derives
          from the STRAW questions. Editing here therefore looked like it corrected your
          staging and silently did not. Showing the derived value is honest until a proper
          "redo staging" flow exists.
        */}
        <div>
          <p className="mb-1 block text-sm font-medium text-sage-700">Menopause stage</p>
          <div className="rounded-lg border border-sand-200 bg-sand-50 px-3 py-2.5">
            <p className="text-sage-800">
              {profile?.straw_stage_label ??
                (profile?.straw_stage ? `Stage ${profile.straw_stage}` : 'Not set')}
            </p>
          </div>
          <p className="mt-1 text-xs text-sage-500">
            {profile?.straw_stage
              ? 'Worked out from your onboarding answers. This drives your provider report and your insights — tell your provider if it looks wrong.'
              : 'Not recorded yet. Your provider report will show “Not specified” until this is set.'}
          </p>
        </div>
        <Select
          label="Weekly check-in day"
          value={String(checkinDay ?? '')}
          onChange={(e) => {
            const v = e.target.value;
            setCheckinDay(v === '' ? null : Number(v));
          }}
          placeholder={checkinDay === null ? 'Pick a day (optional)' : 'Pick a day'}
          options={DAY_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
        />
        {checkinDay === null && (
          <p className="text-xs text-sage-500">
            If you don&apos;t pick a day, your weekly check-in will simply be ready whenever it&apos;s been
            7+ days since your last full check-in.
          </p>
        )}
        <DateOfBirthInput
          label="Date of Birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
        />
        <TimezoneSelect value={preferredTimezone} onChange={setPreferredTimezone} />
        <div>
          <Input
            label="Next provider appointment"
            type="date"
            value={nextAppointmentDate}
            min={appointmentIsPast ? undefined : todayStr}
            onChange={(e) => setNextAppointmentDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-sage-500">
            We&apos;ll count down to it and make sure your provider report is ready.
          </p>
          {appointmentIsPast && (
            <p className="mt-2 text-sm text-amber-700">
              This date has passed. Update it when you schedule your next visit.
            </p>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-sage-700">Has uterus</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUterusAnswer('yes')}
              className={[
                'rounded-lg border px-4 py-2 text-sm',
                uterusAnswer === 'yes' ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
              ].join(' ')}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setUterusAnswer('no')}
              className={[
                'rounded-lg border px-4 py-2 text-sm',
                uterusAnswer === 'no' ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
              ].join(' ')}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setUterusAnswer('unsure')}
              className={[
                'rounded-lg border px-4 py-2 text-sm',
                uterusAnswer === 'unsure' ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
              ].join(' ')}
            >
              I&apos;m not sure
            </button>
          </div>
        </div>
        {profileError && <p className="text-sm text-danger">{profileError}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={isUpdating} loadingText="Saving...">
            Save Profile
          </Button>
          {profileSaved && <span className="text-sm text-success">Saved!</span>}
        </div>
      </form>
    </Card>
  );
}
