import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { PASSWORD_MIN_LENGTH } from '../../lib/constants';
import { validators, validateFields } from '../../utils/validation';

export function AccountSettingsCard() {
  const { user, updatePassword } = useAuth();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

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

  return (
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
  );
}
