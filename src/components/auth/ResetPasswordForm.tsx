import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { validators, validateFields } from '../../utils/validation';
import { PASSWORD_MIN_LENGTH } from '../../lib/constants';
import { CheckCircle } from 'lucide-react';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const { updatePassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validateFields({
      password:
        validators.required(password) ?? validators.minLength(PASSWORD_MIN_LENGTH)(password),
      confirmPassword:
        validators.required(confirmPassword) ?? validators.passwordMatch(password)(confirmPassword),
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const result = await updatePassword(password);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: 'Password updated successfully' } }), 2000);
    } else {
      setFormError(result.error ?? 'Failed to update password');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" />
        <h1 className="font-display text-2xl text-sage-800">Password updated</h1>
        <p className="mt-2 text-sage-500">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="font-display text-2xl text-sage-800">Set new password</h1>
        <p className="mt-1 text-sage-500">Choose a strong password for your account.</p>
      </div>

      {formError && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div>
      )}

      <Input
        label="New Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
      />

      <Input
        label="Confirm New Password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
      />

      <Button type="submit" fullWidth isLoading={isLoading} loadingText="Updating...">
        Update Password
      </Button>

      <p className="text-center text-sm text-sage-500">
        <Link to="/login" className="font-medium text-sage-600 hover:text-sage-800">
          Back to Sign In
        </Link>
      </p>
    </form>
  );
}
