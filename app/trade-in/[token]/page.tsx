import type { Metadata } from 'next';
import { TradeInSubmission } from '@/components/customer/TradeInSubmission';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Vehicle photo valuation · Booran Motors',
  robots: { index: false, follow: false }, referrer: 'no-referrer',
};
export default async function TradeInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TradeInSubmission token={token} />;
}
