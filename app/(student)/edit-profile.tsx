import { ProfileEditor } from '@/components/profile-editor';
import { useAuth } from '@/hooks/use-auth';

/** Student profile editor. */
export default function StudentEditProfileScreen() {
  const { role } = useAuth();
  return <ProfileEditor role={role ?? 'student'} />;
}