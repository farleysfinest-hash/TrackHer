import { AuthLayout } from '../components/auth/AuthLayout';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
