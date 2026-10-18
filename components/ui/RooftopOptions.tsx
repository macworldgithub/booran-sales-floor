'use client';
import { specificDealerships } from '@/lib/locations';
import { useAuth } from '@/lib/auth';

export function RooftopOptions({ allValue = 'all', allowAll = true }: { allValue?: string; allowAll?: boolean }) {
  const { locations, user, locationsError } = useAuth();
  const options = allowAll ? locations : specificDealerships(locations);
  return <>
    {allowAll && <option value={allValue}>{user?.role === 'super_admin' ? 'All dealerships' : `All ${user?.site || 'authorised'} dealerships`}</option>}
    {!allowAll && !options.length && <option value="" disabled>{locationsError ? 'Dealership directory unavailable' : 'Loading dealerships...'}</option>}
    {options.map((name) => <option key={name} value={name}>{name}</option>)}
  </>;
}
