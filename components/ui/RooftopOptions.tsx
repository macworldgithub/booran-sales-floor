'use client';
import { useAuth } from '@/lib/auth';

export function RooftopOptions({ allValue = 'all' }: { allValue?: string }) {
  const { locations, user } = useAuth();
  return <>
    <option value={allValue}>{user?.role === 'super_admin' ? 'All dealerships' : 'All authorised dealerships'}</option>
    {locations.map((name) => <option key={name} value={name}>{name}</option>)}
  </>;
}
