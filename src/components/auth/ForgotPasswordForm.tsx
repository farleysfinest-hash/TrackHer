import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../hooks/useAuth';
import { validators, validateFields } from '../../utils/validation';
import { Mail } from 'lucide-react';

export function ForgotPasswordForm() {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const fieldErrors = validateFields({
      email: validators.required(email) ?? validators.email(email),
    });

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    const result = await resetPassword(email);
    if (result.success) {
      setSuccess(true);
    } else {
      setFormError(result.error ?? 'Failed to send reset link');
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <Mail className="mx-auto mb-4 h-12 w-12 text-sage-400" />
        <h1 className="font-display text-2xl text-sage-800">Check your email</h1>
        <p className="mt-2 text-sage-500">
          If an account exists with this email, you&apos;ll receive a password reset link.
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
        <h1 className="font-display text-2xl text-sage-800">Reset your password</h1>
        <p className="mt-1 text-sage-500">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
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

      <Button type="submit" fullWidth isLoading={isLoading} loadingText="Sending...">
        Send Reset Link
      </Button>

      <p className="text-center text-sm text-sage-500">
        <Link to="/login" className="font-medium text-sage-600 hover:text-sage-800">
          Back to Sign In
        </Link>
      </p>
    </form>
  );
}
