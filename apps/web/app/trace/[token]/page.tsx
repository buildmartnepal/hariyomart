import { TraceabilityPublicView } from '@/components/TraceabilityPublicView';

export default async function TracePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TraceabilityPublicView token={token} />;
}
