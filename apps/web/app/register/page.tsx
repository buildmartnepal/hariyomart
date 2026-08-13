import type { Metadata } from 'next';
import { AuthPanel } from '@/components/AuthPanel';
export const metadata: Metadata = { title: 'Create buyer account' };
export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="container">
        <AuthPanel mode="register" />
      </div>
    </main>
  );
}
