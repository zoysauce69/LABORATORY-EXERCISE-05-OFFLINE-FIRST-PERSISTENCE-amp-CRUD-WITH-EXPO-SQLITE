import { ProfileEditor } from '@/components/profile-editor';
import { useAuth } from '@/hooks/use-auth';

/** Landlord profile editor. */
export default function LandlordEditProfileScreen() {
  const { role } = useAuth();
  return <ProfileEditor role={role ?? 'landlord'} />;
}