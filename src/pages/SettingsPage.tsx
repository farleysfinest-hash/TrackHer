import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DateOfBirthInput } from '../components/ui/DateOfBirthInput';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { ResetAccountModal } from '../components/settings/ResetAccountModal';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { MENOPAUSE_STAGES, APP_VERSION } from '../lib/constants';
import { PASSWORD_MIN_LENGTH } from '../lib/constants';
import { validators, validateFields } from '../utils/validation';
import { getLocalDateISO, getResolvedTimezone } from '../utils/checkinHelpers';
import type { MenopauseStage } from '../types/database';
import { TimezoneSelect } from '../components/ui/TimezoneSelect';
import { getActiveTimezone, isValidTimeZone } from '../utils/localDate';

const DAY_OPTIONS: Array<{ label: string; value: number }> = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut, updatePassword, resetAccount } = useAuth();
  const { profile, update, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [menopauseStage, setMenopauseStage] = useState(profile?.menopause_stage ?? '');
  const [hasUterus, setHasUterus] = useState<boolean | null>(profile?.has_uterus ?? null);
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

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const timezone = getResolvedTimezone(profile?.timezone);
  const todayStr = getLocalDateISO(timezone);
  const appointmentIsPast =
    !!nextAppointmentDate && nextAppointmentDate < todayStr;

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setMenopauseStage(profile.menopause_stage ?? '');
      setHasUterus(profile.has_uterus);
      setPreferredTimezone(profile.timezone ?? getActiveTimezone());
      setDateOfBirth(profile.date_of_birth ?? '');
      setCheckinDay(profile.checkin_day ?? null);
      setNextAppointmentDate(profile.next_appointment_date ?? '');
    }
  }, [profile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasUterus === null) {
      setProfileError('Please answer whether you currently have your uterus.');
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
      menopause_stage: (menopauseStage || undefined) as MenopauseStage | undefined,
      has_uterus: hasUterus,
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateFields({
      newPassword:
        validators.required(newPassword) ?? validators.minLength(PASSWORD_MIN_LENGTH)(newPassword),
      confirmPassword:
        validators.required(confirmPassword) ??
        validators.passwordMatch(newPassword)(confirmPassword),
    });
    if (Object.keys(fieldErrors).length > 0) {
      setPasswordErrors(fieldErrors);
      return;
    }
    setPasswordErrors({});
    const result = await updatePassword(newPassword);
    if (result.success) {
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-sage-800">Settings</h1>
        <p className="mt-1 text-sage-500">Manage your profile and account preferences.</p>
      </div>

      <Card>
        <h2 className="font-display text-xl text-sage-800">Profile</h2>
        <form onSubmit={handleProfileSave} className="mt-4 space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Select
            label="Menopause Stage"
            value={menopauseStage}
            onChange={(e) => setMenopauseStage(e.target.value)}
            placeholder="Select stage"
            options={MENOPAUSE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
          />
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
                onClick={() => setHasUterus(true)}
                className={[
                  'rounded-lg border px-4 py-2 text-sm',
                  hasUterus === true ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
                ].join(' ')}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setHasUterus(false)}
                className={[
                  'rounded-lg border px-4 py-2 text-sm',
                  hasUterus === false ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
                ].join(' ')}
              >
                No
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

      <Card>
        <h2 className="font-display text-xl text-sage-800">Account</h2>
        <div className="mt-4 space-y-4">
          <Input label="Email" type="email" value={user?.email ?? ''} readOnly className="bg-sage-50" />
          {!showPasswordForm ? (
            <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
              Change Password
            </Button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={passwordErrors.newPassword}
              />
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordErrors.confirmPassword}
              />
              <div className="flex gap-3">
                <Button type="submit">Update Password</Button>
                <Button variant="ghost" onClick={() => setShowPasswordForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl text-sage-800">Data</h2>
        <div className="mt-4 space-y-4">
          <Button variant="secondary" disabled title="Coming soon">
            Export My Data
          </Button>
          <p className="text-xs text-sage-400">Data export coming in a future update.</p>

          <div className="rounded-lg border border-sand-200 bg-sand-50 p-4">
            <h3 className="text-sm font-medium text-sage-700">Reset account</h3>
            <p className="mt-1 text-sm text-sage-500">
              Erase all TrackHer data—including profile answers and preferences—and start over.
              Your login and email stay the same.
            </p>
            <Button
              variant="danger"
              className="mt-3"
              onClick={() => setShowResetModal(true)}
            >
              Reset Account
            </Button>
          </div>

          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            Delete My Account
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl text-sage-800">About</h2>
        <div className="mt-4 space-y-3 text-sm text-sage-600">
          <p>Version {APP_VERSION}</p>
          <p>
            <Link to="/privacy" className="text-sage-600 underline hover:text-sage-800">
              Privacy Policy
            </Link>
            {' · '}
            <Link to="/terms" className="text-sage-600 underline hover:text-sage-800">
              Terms of Service
            </Link>
          </p>
          <MedicalDisclaimer variant="inline" />
        </div>
      </Card>

      <Button variant="ghost" onClick={handleSignOut}>
        Sign Out
      </Button>

      <ResetAccountModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={resetAccount}
      />

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <Card className="max-w-md">
            <h3 className="font-display text-xl text-sage-800">Delete Account?</h3>
            <p className="mt-2 text-sm text-sage-500">
              This action cannot be undone. All your data will be permanently deleted. Please
              contact support to request account deletion.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="danger" onClick={() => setShowDeleteModal(false)}>
                I Understand
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
