import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { MedicalDisclaimer } from '../ui/MedicalDisclaimer';
import { APP_VERSION } from '../../lib/constants';

export function AboutSettingsCard() {
  return (
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
  );
}
