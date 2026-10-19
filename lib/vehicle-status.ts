import type { Vehicle } from './types';

export function vehicleStatus(vehicle: Vehicle, now = Date.now()) {
  // A sold/unavailable vehicle cannot become available merely because hold metadata remains.
  const stockStatus = vehicle.status || 'Unknown status';
  if (!['Soft Hold', 'In Stock', 'IN-STOCK'].includes(stockStatus)) return { label: stockStatus, held: false, available: false };
  const expired = Boolean(vehicle.softHold?.expiresAt && Date.parse(vehicle.softHold.expiresAt) <= now);
  const held = !expired && (stockStatus === 'Soft Hold' || Boolean(vehicle.softHold?.held));
  return { label: held ? 'Soft Hold' : 'In Stock', held, available: !held };
}
