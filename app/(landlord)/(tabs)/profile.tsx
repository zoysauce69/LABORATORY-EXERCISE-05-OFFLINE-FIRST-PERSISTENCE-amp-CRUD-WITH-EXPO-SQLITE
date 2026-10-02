import { ProfilePanel } from '@/components/profile-panel';
import { useAuth } from '@/hooks/use-auth';

/** Landlord Profile tab. */
export default function LandlordProfileScreen() {
  const { role } = useAuth();
  return <ProfilePanel role={role ?? 'landlord'} />;
}