import { farmerSections } from '@/lib/dashboard';
import { DashboardPage } from '@/components/DashboardPage';
export function generateStaticParams() {
  return farmerSections.map((section) => ({ section }));
}
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <DashboardPage role="Farmer" section={section} sections={farmerSections} />;
}
