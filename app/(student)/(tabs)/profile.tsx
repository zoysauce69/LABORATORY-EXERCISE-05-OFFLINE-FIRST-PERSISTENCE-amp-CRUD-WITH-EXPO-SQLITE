import { ProfilePanel } from '@/components/profile-panel';
import { useAuth } from '@/hooks/use-auth';

/** Student Profile tab. */
export default function StudentProfileScreen() {
  const { role } = useAuth();
  return <ProfilePanel role={role ?? 'student'} />;
}