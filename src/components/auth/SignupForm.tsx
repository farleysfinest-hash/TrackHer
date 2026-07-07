import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { validators, validateFields } from '../../utils/validation';
import { PASSWORD_MIN_LENGTH } from '../../lib/constants';
import { CheckCircle } from 'lucide-react';

export function SignupForm() {
  const { signUp, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validateFields({
      displayName: validators.required(displayName),
      email: validators.required(email) ?? validators.email(email),
      password:
        validators.required(password) ?? validators.minLength(PASSWORD_MIN_LENGTH)(password),
      confirmPassword:
        validators.required(confirmPassword) ?? validators.passwordMatch(password)(confirmPassword),
      terms: agreedToTerms ? null : 'You must agree to the Terms of Service and Privacy Policy',
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const result = await signUp(email, password, displayName);
    if (result.success) {
      setSuccess(true);
    } else {
      setFormError(result.error ?? 'Failed to create account');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" />
        <h1 className="font-display text-2xl text-sage-800">Check your email</h1>
        <p className="mt-2 text-sage-500">
          We sent a verification link to <strong>{email}</strong>. Click the link to verify your
          account, then sign in.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="secondary">Back to Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-sage-800">Create your account</h1>
        <p className="mt-1 text-sage-500">Start tracking your HRT journey with confidence.</p>
      </div>

      {formError && (
        <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{formError}</div>
      )}

      <Input
        label="Display Name"
        type="text"
        autoComplete="name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        error={errors.displayName}
        placeholder="How should we address you?"
      />

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
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        helperText={`At least ${PASSWORD_MIN_LENGTH} characters`}
      />

      <Input
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
      />

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-1 rounded border-sand-300 text-sage-500 focus:ring-sage-500"
        />
        <span className="text-sm text-sage-600">
          By creating an account, you agree to our{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-sage-700 underline hover:text-sage-800">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-sage-700 underline hover:text-sage-800">Privacy Policy</a>
        </span>
      </label>
      {errors.terms && <p className="text-sm text-danger">{errors.terms}</p>}

      <Button type="submit" fullWidth isLoading={isLoading} loadingText="Creating account...">
        Create Account
      </Button>

      <p className="text-center text-sm text-sage-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-sage-600 hover:text-sage-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}
