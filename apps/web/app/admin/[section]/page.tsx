import { adminSections } from '@/lib/dashboard';
import { DashboardPage } from '@/components/DashboardPage';
export function generateStaticParams() {
  return adminSections.map((section) => ({ section }));
}
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <DashboardPage role="Admin" section={section} sections={adminSections} />;
}
