import type { Metadata } from 'next';
import { AuthPanel } from '@/components/AuthPanel';
export const metadata: Metadata = { title: 'Sign in' };
export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="container">
        <AuthPanel mode="login" />
      </div>
    </main>
  );
}
