export interface CustomerMedia {
  status?: 'ready' | 'processing' | 'rendering' | 'processing_failed';
  processing_error?: string;
  views?: number;
  reviews?: number;
  branded?: boolean;
  sent?: boolean;
  id: string;
  name: string;
  content_type: string;
  size: number;
  url: string;
  created_at: string;
}

export interface CustomerMessage {
  id: string;
  body: string;
  phone: string;
  author: string;
  created_at: string;
  status: 'pending' | 'queued' | 'scheduled' | 'sent' | 'delivered' | 'received' | 'failed' | 'cancelled' | 'unknown' | string;
  direction?: 'inbound' | 'outbound';
  source?: string;
  dealership?: string;
  error?: string;
  attachments: CustomerMedia[];
}

export interface CustomerMessageHistory {
  messages: CustomerMessage[];
  sms_available: boolean;
  media_available: boolean;
  recording_available?: boolean;
  media_unavailable_reason?: string;
  history_warning?: string;
}

export type ProspectEngagement = { policyVersion: string; computedAt: string; score: number; state: 'buying' | 'losing' | 'neutral'; label: string; linkedVehicles: string[];
  signals: { key: string; score: number; reason: string; metrics: Record<string, number | string | boolean | null>; evidenceCount: number }[] };
export type HoldingCostBreakdown = { policyVersion: string; annualRate: number; yearDays: number; vehicleCost: number | null; daysInStock: number; floorplanCost: number | null;
  carsalesLeads: number; driveLeads: number; carsalesRate: number; driveRate: number; carsalesCost: number; driveCost: number; leadCharges: number; total: number | null;
  computedAt: string; leadDataCheckedAt: string | null; warnings: string[]; segments: { source: string; type: string; count: number }[] };
export type VehicleEngagementSummary = { activeProspects: number; buying: number; losing: number; neutral: number };
export interface Lead {
  engagement?: ProspectEngagement | null;
  quick_walk_in?: boolean;
  overdue?: boolean;
  last_activity_at?: string;
  followup_days?: string[];
  next_action?: { title: string; due_at: string; recorded_at: string; author: string; status?: 'open' | 'completed' | 'awaiting_approval' } | null;
  next_action_review?: { id: string; status: string; due_at: string; title: string; requested_name: string; notes?: string } | null;
  communication_consent?: { opted_out: boolean; reason: string; changed_at: string };
  consent_review?: { id: string; status: string; opt_out: boolean; reason: string; requested_name: string };
  opted_out?: boolean;
  last_video_viewed_at?: string;
  loss_review?: { id: string; status: 'pending' | 'approved' | 'returned' | 'cancelled'; reason: string; requested_name: string; requested_at: string; notes?: string; last_action?: string; reviewed_name?: string; connex_lost_reason?: string };
  external?: { id?: string; source?: string; opportunity_status?: string; details_revealed?: boolean; virtualyard?: { lead_id?: string } };
  source_refs?: { source: string; deal_id?: string; external?: { virtualyard?: { lead_id?: string } }; sms_campaign?: { stage?: string; active?: boolean }; nexgate?: { stage?: string; comments?: string } }[];
  alternate_phones?: string[];
  alternate_emails?: string[];

  _id: string;
  id?: string;
  deal_id?: string;
  name: string;
  customer_name?: string;
  initials?: string;
  vehicle?: string;
  make?: string;
  model?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  status: 'new_lead' | 'following_up' | 'sold' | 'lost' | 'returned' | string;
  dealership: string;
  dealership_name?: string;
  dealer_code?: string;
  owner_name?: string;
  owner_id?: string | null;
  business_name?: string;
  business_id?: string | null;
  source_channel?: string;
  source_stage?: string;
  source_owner?: string;
  source_comments?: string;
  assignedTo?: string;
  phone?: string;
  customer_phone?: string;
  email?: string;
  customer_email?: string;
  notes?: string;
  source?: string;
  created_at?: string;
  first_contact_at?: string;
  minutes_to_first_contact?: number;
  first_followup_due_at?: string;
  had_contact_opportunity?: boolean;
  follow_ups_sent?: number;
  priority?: boolean;
  testDrive?: {
    testDriveDate?: string | null;
    location?: string;
    status?: string;
    confirmed?: boolean;
  };
  tradeIn?: {
    vin?: string;
    make?: string;
    model?: string;
    year?: number;
    rego?: string;
    estimatedValue?: number;
  };
  diary_entries?: {
    id?: string;
    edited_at?: string;
    edited_by_name?: string;
    author: string;
    author_role?: string;
    kind?: string;
    date: string;
    note: string;
  }[];
  post_sales_followup?: any;
  sold_at?: string;
  delivery_date?: string;
  deal_number?: string;
  lost_at?: string;
  lost_final_sms?: {
    status: string;
    sent_at?: string;
    message_id?: string;
    body?: string;
    error?: string;
  };
}

export interface Vehicle {
  _id: string;
  stockNumber: string;
  vin: string;
  make: string;
  model: string;
  variant?: string;
  year?: number;
  colour?: string;
  body?: string;
  transmission?: string;
  fuel?: string;
  odometer?: number;
  category: 'New' | 'Used' | 'Demo' | 'Loaner' | string;
  status: 'In Stock' | 'Soft Hold' | 'Sold' | string;
  advertisedPrice?: number;
  vehicleCost?: number;
  totalStockCost?: number;
  potentialGross?: number;
  accumulatedHoldingCost?: number | null;
  holdingCostPerDay?: number | null;
  holdingCostBreakdown?: HoldingCostBreakdown;
  engagementSummary?: VehicleEngagementSummary;
  usedCarLeadTimeDays?: number | null;
  dateInStock?: string;
  daysInStock: number;
  agingBucket: '0-30' | '31-45' | '46-60' | '61-90' | '90+' | string;
  rooftopId?: string;
  rooftopName: string;
  branchCode?: string;
  frontlineReady?: boolean;
  isLiveOnWebsite?: boolean;
  isPriceReviewRequired?: boolean;
  photos?: string[];
  heroPhoto?: string;
  listingUrl?: string;
  salesperson?: string;
  actionReason?: string;
  recommendedAction?: string;
  rego?: string;
  softHold?: {
    holdId?: string;
    held: boolean;
    prospectName: string;
    notes?: string;
    consultant?: string;
    heldAt?: string;
    expiresAt?: string;
  };
}

export interface ActionItem {
  _id: string;
  actionType: 'PRICE' | 'WHOLESALE' | 'TRANSFER' | string;
  vin: string;
  stockNumber: string;
  vehicleTitle: string;
  rooftopId: string;
  rooftopName: string;
  targetRooftopName?: string;
  reason: string;
  impactMetric: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt?: string;
  resolvedNotes?: string;
}

export interface Rooftop {
  _id?: string;
  id?: string;
  rooftopId?: string;
  name: string;
  location?: string;
  brand?: string;
  dealerPrincipal?: string;
  generalManager?: string;
  dailyHoldingCostRate?: number;
  pentanaBranchCodes?: string[];
  active?: boolean;
}

export interface FeedLog {
  _id: string;
  feedType: string;
  scheduledWindow: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  totalPentanaRows: number;
  totalWebsiteRows: number;
  reconciledCount: number;
  quarantinedCount: number;
  newArrivalsCount?: number;
  soldExitsCount?: number;
  priceChangesCount?: number;
  durationMs: number;
  notes: string;
  createdAt: string;
}

export interface CsvSyncResult {
  success: boolean;
  filesProcessed: number;
  vehiclesProcessed: number;
  inserted: number;
  updated: number;
  totalInDb: number;
  actionsSynced: number;
  durationMs: number;
}

export interface Appointment {
  dealership?: string;
  _id: string;
  virtualyard?: { id?: string; status?: string };
  leadId?: string;
  prospectName: string;
  consultantName?: string;
  vehicle?: string;
  type: 'Test Drive' | 'Showroom Visit' | 'Delivery Handover' | 'Callback';
  when: string;
  duration?: number;
  notes?: string;
  status: 'Booked' | 'Completed' | 'No Show' | 'Cancelled';
  createdAt?: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  role: string;
  position?: string;
  site: string;
  active: boolean;
  totalLeads: number;
  soldCount: number;
  followingUpCount: number;
  conversionRate: string;
  loadCapacity: number;
  initials: string;
}

export interface CustomerHistoryItem {
  id: string;
  origin: 'deal' | 'dms_feed' | 'lead_sale' | string;
  scope: 'customer' | 'business';
  buyerName: string;
  businessName: string | null;
  vehicle: string;
  make: string;
  model: string;
  year: number | null;
  vin: string;
  stockNumber: string;
  dealNumber: string;
  purchaseDate: string | null;
  deliveryDate: string | null;
  salePriceCents: number | null;
  salesperson: string;
  status: 'Delivered' | 'Completed' | 'Sold' | 'Registered' | 'Cancelled' | string;
  statusRaw: string;
  appraisalId: string | null;
  leadId: string;
}

export interface CustomerHistorySummary {
  totalVehiclesPurchased: number;
  totalDeals: number;
  lifetimeSpendCents: number | null;
  pricedPurchasesCount: number;
  lastPurchaseDate: string | null;
  customerPurchasesCount: number;
  businessPurchasesCount: number;
}

export interface CustomerServiceBookingSummary {
  id: string;
  startsAt: string;
  vehicle: string;
  status: string;
  reference: string;
}

export interface CustomerHistoryData {
  summary: CustomerHistorySummary;
  items: CustomerHistoryItem[];
  hasLinkedBusiness: boolean;
  linkedBusinesses: { id: string; name: string; role: string }[];
  appraisalsCount: number;
  deliveriesCount: number;
  notesCount: number;
  serviceBookings: CustomerServiceBookingSummary[];
}

export interface BusinessEntity {
  _id: string;
  name: string;
  abn: string;
  industry: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  dealership: string;
}

export interface BusinessPersonSummary {
  leadId: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  isPrimary: boolean;
  status: string;
  vehicle: string;
  isCurrentPerson: boolean;
  canOpen: boolean;
}

export interface BusinessAssociation {
  business: BusinessEntity;
  link: {
    _id: string | null;
    role: string;
    isPrimary: boolean;
    createdAt: string | null;
    syncedFromLead?: boolean;
  };
  people: BusinessPersonSummary[];
}

export interface CustomerBusinessData {
  person: { id: string; name: string; phone: string; email: string; dealership: string };
  primaryBusinessId: string | null;
  businesses: BusinessAssociation[];
}

export interface BusinessSearchHit {
  _id: string;
  name: string;
  abn: string;
  industry: string;
}

export interface UnifiedSummary {
  crm: {
    totalLeads: number;
    followingUp: number;
    newLeads: number;
  };
  inventory: {
    totalVehicles: number;
    agingOver90Days: number;
    openActionItems: number;
  };
  system: {
    rooftopGroup: string;
    activeRooftops: number;
    lastSync: string;
  };
}
