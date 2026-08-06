import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ResetAccountModal } from '../components/settings/ResetAccountModal';
import { DeleteAccountModal } from '../components/settings/DeleteAccountModal';
import { RemindersSettingsCard } from '../components/settings/RemindersSettingsCard';
import { SubscriptionSettingsCard } from '../components/settings/SubscriptionSettingsCard';
import { ProfileSettingsCard } from '../components/settings/ProfileSettingsCard';
import { HapticDiagnosticsCard } from '../components/settings/HapticDiagnosticsCard';
import { AccountSettingsCard } from '../components/settings/AccountSettingsCard';
import { DataSettingsCard } from '../components/settings/DataSettingsCard';
import { AboutSettingsCard } from '../components/settings/AboutSettingsCard';
import { HealthSettingsCard } from '../components/settings/HealthSettingsCard';
import { useAuth } from '../hooks/useAuth';

export function SettingsPage() {
  const navigate = useNavigate();
  const { signOut, resetAccount, deleteAccount } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

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

      <ProfileSettingsCard />
      <RemindersSettingsCard />
      <HealthSettingsCard />
      <SubscriptionSettingsCard />
      <HapticDiagnosticsCard />
      <AccountSettingsCard />
      <DataSettingsCard
        onRequestReset={() => setShowResetModal(true)}
        onRequestDelete={() => setShowDeleteModal(true)}
      />
      <AboutSettingsCard />

      <Button variant="ghost" onClick={handleSignOut}>
        Sign Out
      </Button>

      <ResetAccountModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onReset={resetAccount}
      />

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDelete={deleteAccount}
      />
    </div>
  );
}
