import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { DateOfBirthInput } from '../components/ui/DateOfBirthInput';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { MedicalDisclaimer } from '../components/ui/MedicalDisclaimer';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { MENOPAUSE_STAGES, CHECKIN_FREQUENCIES, APP_VERSION } from '../lib/constants';
import { PASSWORD_MIN_LENGTH } from '../lib/constants';
import { validators, validateFields } from '../utils/validation';
import type { MenopauseStage, CheckinFrequency } from '../types/database';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, signOut, updatePassword } = useAuth();
  const { profile, update, isUpdating } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [menopauseStage, setMenopauseStage] = useState(profile?.menopause_stage ?? '');
  const [hasUterus, setHasUterus] = useState(profile?.has_uterus ?? true);
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '');
  const [checkinFrequency, setCheckinFrequency] = useState(profile?.checkin_frequency ?? '');
  const [profileSaved, setProfileSaved] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setMenopauseStage(profile.menopause_stage ?? '');
      setHasUterus(profile.has_uterus ?? true);
      setDateOfBirth(profile.date_of_birth ?? '');
      setCheckinFrequency(profile.checkin_frequency ?? '');
    }
  }, [profile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await update({
      display_name: displayName,
      menopause_stage: (menopauseStage || undefined) as MenopauseStage | undefined,
      has_uterus: hasUterus,
      date_of_birth: dateOfBirth || undefined,
      checkin_frequency: (checkinFrequency || undefined) as CheckinFrequency | undefined,
    });
    if (result.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
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
            label="Check-in Frequency"
            value={checkinFrequency}
            onChange={(e) => setCheckinFrequency(e.target.value)}
            placeholder="Select frequency"
            options={CHECKIN_FREQUENCIES.map((f) => ({ value: f.value, label: f.label }))}
          />
          <DateOfBirthInput
            label="Date of Birth"
            value={dateOfBirth}
            onChange={setDateOfBirth}
          />
          <div>
            <p className="mb-2 text-sm font-medium text-sage-700">Has uterus</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setHasUterus(true)}
                className={[
                  'rounded-lg border px-4 py-2 text-sm',
                  hasUterus ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
                ].join(' ')}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setHasUterus(false)}
                className={[
                  'rounded-lg border px-4 py-2 text-sm',
                  !hasUterus ? 'border-sage-500 bg-sage-50' : 'border-sand-200',
                ].join(' ')}
              >
                No
              </button>
            </div>
          </div>
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
        <div className="mt-4 space-y-3">
          <Button variant="secondary" disabled title="Coming soon">
            Export My Data
          </Button>
          <p className="text-xs text-sage-400">Data export coming in a future update.</p>
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
