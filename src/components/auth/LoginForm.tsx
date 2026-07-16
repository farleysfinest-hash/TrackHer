import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { validators, validateFields } from '../../utils/validation';
import { hasConfirmedProfileContext } from '../../utils/profileContext';

export function LoginForm() {
  const navigate = useNavigate();
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validateFields({
      email: validators.required(email) ?? validators.email(email),
      password: validators.required(password),
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const result = await signIn(email, password);
    if (result.success) {
      const currentProfile = useAuthStore.getState().profile;
      navigate(
        !currentProfile?.onboarding_completed
          ? '/onboarding'
          : hasConfirmedProfileContext(currentProfile)
            ? '/dashboard'
            : '/profile-confirmation',
      );
    } else {
      setFormError(result.error ?? 'Failed to sign in');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-sage-800">Welcome back</h1>
        <p className="mt-1 text-sage-500">Sign in to continue tracking your wellness journey.</p>
      </div>

      {formError && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div>
      )}

      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        placeholder="you@example.com"
      />

      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-sage-600">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-sand-300 text-sage-500 focus:ring-sage-500"
          />
          Remember me
        </label>
        <Link to="/forgot-password" className="text-sm text-sage-600 hover:text-sage-800">
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading} loadingText="Signing in...">
        Sign In
      </Button>

      <p className="text-center text-sm text-sage-500">
        New here?{' '}
        <Link to="/signup" className="font-medium text-sage-600 hover:text-sage-800">
          Create an account
        </Link>
      </p>
    </form>
  );
}
