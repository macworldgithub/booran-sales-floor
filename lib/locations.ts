export function specificDealerships(locations: string[]): string[] {
  return locations.filter((name) => !['all', 'all locations', 'south morang'].includes(name.trim().toLowerCase()));
}
