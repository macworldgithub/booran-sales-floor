import type { AuthUser } from './auth';

const salesTabs = ['today', 'leads', 'calendar'];
const managementTabs = ['inventory', 'action-items', 'rooftops', 'staff'];

export function canOpenTab(tab: string, role: AuthUser['role']) {
  if (salesTabs.includes(tab)) return true;
  if (role === 'sales_consultant' || role === 'contractor') return false;
  return managementTabs.includes(tab) || (tab === 'feed-logs' && role === 'super_admin');
}
