'use client';

import React, { useEffect, useState } from 'react';
import {
  Building2,
  ExternalLink,
  User,
  Users,
  Phone,
  Plus,
  UserPlus,
  Info,
  Trash2,
  Check,
  Search,
} from 'lucide-react';
import { leadApi } from '@/lib/api';
import type {
  BusinessAssociation,
  BusinessSearchHit,
  CustomerBusinessData,
  Lead,
} from '@/lib/types';

export function CustomerBusinessTab({
  lead,
  onLeadUpdated,
  onOpenLead,
}: {
  lead: Lead;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onOpenLead?: (targetLead: Lead) => void;
}) {
  const [data, setData] = useState<CustomerBusinessData | null>(null);
  const [selectedBizId, setSelectedBizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAllPeople, setShowAllPeople] = useState(false);

  // Panels / sub-views
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [showAddPersonPanel, setShowAddPersonPanel] = useState(false);

  // Attach business state
  const [bizSearch, setBizSearch] = useState('');
  const [bizResults, setBizResults] = useState<BusinessSearchHit[]>([]);
  const [attachMode, setAttachMode] = useState<'existing' | 'new'>('new');
  const [newBizName, setNewBizName] = useState('');
  const [newBizAbn, setNewBizAbn] = useState('');
  const [newBizIndustry, setNewBizIndustry] = useState('');
  const [attachRole, setAttachRole] = useState('');
  const [attachPrimary, setAttachPrimary] = useState(true);

  // Add person state
  const [personMode, setPersonMode] = useState<'existing' | 'new'>('existing');
  const [personSearch, setPersonSearch] = useState('');
  const [personResults, setPersonResults] = useState<Lead[]>([]);
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [personRole, setPersonRole] = useState('');
  const [personPrimary, setPersonPrimary] = useState(false);

  // Edit business form state
  const [editName, setEditName] = useState('');
  const [editAbn, setEditAbn] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLinkRole, setEditLinkRole] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    leadApi
      .getBusiness(lead._id, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted && res.data) {
          setData(res.data);
          setSelectedBizId((prev) =>
            prev && res.data!.businesses.some((b) => b.business._id === prev)
              ? prev
              : res.data!.primaryBusinessId,
          );
        }
      })
      .catch((err: any) => {
        if (!controller.signal.aborted) setError(err?.message || 'Unable to load business links.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [lead._id, lead.business_name, lead.business_id]);

  // Search businesses when attach panel open
  useEffect(() => {
    if (!showAttachPanel) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      leadApi
        .searchBusinesses(lead._id, bizSearch, { signal: controller.signal })
        .then((res) => {
          if (!controller.signal.aborted && res.data) {
            setBizResults(res.data);
            if (!bizSearch && res.data.length > 0) setAttachMode('existing');
          }
        })
        .catch(() => {});
    }, bizSearch ? 200 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [showAttachPanel, bizSearch, lead._id]);

  // Search people when add-person panel open
  useEffect(() => {
    if (!showAddPersonPanel || personMode !== 'existing') return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      leadApi
        .searchBusinessPeople(lead._id, personSearch, { signal: controller.signal })
        .then((res) => {
          if (!controller.signal.aborted && res.data) setPersonResults(res.data);
        })
        .catch(() => {});
    }, personSearch ? 200 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [showAddPersonPanel, personMode, personSearch, lead._id]);

  const applyMutationResult = (resData: { business: CustomerBusinessData; lead: Lead }) => {
    setData(resData.business);
    setSelectedBizId((prev) =>
      prev && resData.business.businesses.some((b) => b.business._id === prev)
        ? prev
        : resData.business.primaryBusinessId,
    );
    onLeadUpdated?.(resData.lead);
  };

  const openFullBusiness = (entry: BusinessAssociation) => {
    if (editingBizId === entry.business._id) {
      setEditingBizId(null);
      return;
    }
    setEditingBizId(entry.business._id);
    setEditName(entry.business.name);
    setEditAbn(entry.business.abn || '');
    setEditIndustry(entry.business.industry || '');
    setEditPhone(entry.business.phone || '');
    setEditEmail(entry.business.email || '');
    setEditAddress(entry.business.address || '');
    setEditNotes(entry.business.notes || '');
    setEditLinkRole(entry.link.role || '');
  };

  const handleTogglePrimary = async (entry: BusinessAssociation) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.updateBusinessLink(lead._id, entry.business._id, {
        isPrimary: !entry.link.isPrimary,
      });
      if (res.data) applyMutationResult(res.data);
    } catch (err: any) {
      setError(err?.message || 'Unable to update primary contact status.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveFullBusiness = async (e: React.FormEvent, bizId: string) => {
    e.preventDefault();
    if (busy || !editName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.updateBusinessLink(lead._id, bizId, {
        name: editName.trim(),
        abn: editAbn.trim(),
        industry: editIndustry.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        address: editAddress.trim(),
        notes: editNotes.trim(),
        role: editLinkRole.trim() || 'Contact',
      });
      if (res.data) {
        applyMutationResult(res.data);
        setEditingBizId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save business details.');
    } finally {
      setBusy(false);
    }
  };

  const handleAttachExisting = async (hit: BusinessSearchHit) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.attachBusiness(lead._id, {
        businessId: hit._id,
        role: attachRole.trim() || 'Contact',
        isPrimary: attachPrimary,
      });
      if (res.data) {
        applyMutationResult(res.data);
        setSelectedBizId(hit._id);
        setShowAttachPanel(false);
        setAttachRole('');
        setBizSearch('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to attach business.');
    } finally {
      setBusy(false);
    }
  };

  const handleAttachNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !newBizName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.attachBusiness(lead._id, {
        name: newBizName.trim(),
        abn: newBizAbn.trim(),
        industry: newBizIndustry.trim(),
        role: attachRole.trim() || 'Contact',
        isPrimary: attachPrimary,
      });
      if (res.data) {
        applyMutationResult(res.data);
        setShowAttachPanel(false);
        setNewBizName('');
        setNewBizAbn('');
        setNewBizIndustry('');
        setAttachRole('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to create and attach business.');
    } finally {
      setBusy(false);
    }
  };

  const handleDetach = async (bizId: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.detachBusiness(lead._id, bizId);
      if (res.data) {
        applyMutationResult(res.data);
        setEditingBizId(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to remove business association.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddPerson = async (existingLeadId?: string) => {
    if (!activeEntry || busy) return;
    if (!existingLeadId && !personName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await leadApi.addPersonToBusiness(
        lead._id,
        activeEntry.business._id,
        existingLeadId
          ? { existingLeadId, role: personRole.trim() || 'Contact', isPrimary: personPrimary }
          : {
              name: personName.trim(),
              phone: personPhone.trim(),
              email: personEmail.trim(),
              role: personRole.trim() || 'Contact',
              isPrimary: personPrimary,
            },
      );
      if (res.data) {
        applyMutationResult(res.data);
        setShowAddPersonPanel(false);
        setPersonName('');
        setPersonPhone('');
        setPersonEmail('');
        setPersonRole('');
        setPersonPrimary(false);
        setPersonSearch('');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to add person to business.');
    } finally {
      setBusy(false);
    }
  };

  const handleOpenPerson = async (leadId: string) => {
    if (!onOpenLead) return;
    try {
      const res = await leadApi.getLead(leadId);
      if (res.data) onOpenLead(res.data);
    } catch (err: any) {
      setError(err?.message || 'Unable to open customer profile.');
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse" aria-label="Loading business associations">
        <div className="h-32 rounded-xl bg-slate-100 border border-slate-200" />
        <div className="h-28 rounded-xl bg-slate-100 border border-slate-200" />
      </div>
    );
  }

  const businesses = data?.businesses || [];
  const activeEntry =
    businesses.find((b) => b.business._id === selectedBizId) || businesses[0] || null;
  const otherBusinesses = activeEntry
    ? businesses.filter((b) => b.business._id !== activeEntry.business._id)
    : [];
  const otherPeople = activeEntry
    ? activeEntry.people.filter((p) => !p.isCurrentPerson)
    : [];
  const visiblePeople = showAllPeople ? otherPeople : otherPeople.slice(0, 3);

  return (
    <div className="space-y-5" aria-label="Business and company associations">
      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      {!activeEntry ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">No business linked yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Link this customer to a company or fleet account to track all contacts and combined vehicle purchases.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Linked Business Card */}
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-950 truncate">
                    {activeEntry.business.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeEntry.business.abn ? `ABN ${activeEntry.business.abn}` : 'ABN not recorded'}
                    {activeEntry.link.role ? ` · Role: ${activeEntry.link.role}` : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openFullBusiness(activeEntry)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{editingBizId === activeEntry.business._id ? 'Hide business details' : 'View full business'}</span>
              </button>
            </div>

            {/* Primary Contact Toggle */}
            <div className="px-4 py-3 flex items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <p className="text-xs font-bold text-slate-900">Primary contact</p>
                <p className="text-[11px] text-slate-500">
                  This person is the main contact for this business.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activeEntry.link.isPrimary}
                aria-label="Primary contact"
                disabled={busy}
                onClick={() => handleTogglePrimary(activeEntry)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${
                  activeEntry.link.isPrimary ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    activeEntry.link.isPrimary ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Expanded Full Business Details / Editor */}
            {editingBizId === activeEntry.business._id && (
              <form
                onSubmit={(e) => handleSaveFullBusiness(e, activeEntry.business._id)}
                className="border-t border-slate-200 p-4 space-y-3 bg-slate-50 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="font-semibold text-slate-700">
                    Business name
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="font-semibold text-slate-700">
                    ABN
                    <input
                      type="text"
                      placeholder="e.g. 45 672 389 514"
                      value={editAbn}
                      onChange={(e) => setEditAbn(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="font-semibold text-slate-700">
                    Relationship / Role
                    <input
                      type="text"
                      placeholder="e.g. Director, Fleet Manager"
                      value={editLinkRole}
                      onChange={(e) => setEditLinkRole(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="font-semibold text-slate-700">
                    Industry / Type
                    <input
                      type="text"
                      placeholder="e.g. Transport & Logistics"
                      value={editIndustry}
                      onChange={(e) => setEditIndustry(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="font-semibold text-slate-700">
                    Company phone
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="font-semibold text-slate-700">
                    Company email
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="sm:col-span-2 font-semibold text-slate-700">
                    Address
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                  <label className="sm:col-span-2 font-semibold text-slate-700">
                    Notes
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDetach(activeEntry.business._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Unlink business</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingBizId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save business</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          {/* People Attached to This Business */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">People attached to this business</h4>
                <p className="text-[11px] text-slate-500">
                  {otherPeople.length
                    ? `${otherPeople.length} other ${otherPeople.length === 1 ? 'person' : 'people'} attached`
                    : 'No other contacts attached yet'}
                </p>
              </div>
              {otherPeople.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllPeople((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{showAllPeople ? 'Show fewer' : `View all (${otherPeople.length})`}</span>
                </button>
              )}
            </div>

            {!!visiblePeople.length && (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {visiblePeople.map((person) => (
                  <div key={person.leadId} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {person.canOpen && onOpenLead ? (
                            <button
                              type="button"
                              onClick={() => handleOpenPerson(person.leadId)}
                              className="text-xs font-bold text-slate-900 hover:text-blue-700 underline decoration-slate-300 truncate"
                            >
                              {person.name}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {person.name}
                            </span>
                          )}
                          {person.isPrimary && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Primary
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {person.role}
                          {person.phone ? ` · ${person.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    {person.phone && (
                      <a
                        href={`tel:${person.phone}`}
                        aria-label={`Call ${person.name}`}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Other Linked Businesses */}
          {!!otherBusinesses.length && (
            <section className="space-y-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900">This person is linked to</h4>
                <p className="text-[11px] text-slate-500">
                  Other businesses this person is associated with
                </p>
              </div>
              <div className="space-y-2">
                {otherBusinesses.map((entry) => (
                  <button
                    key={entry.business._id}
                    type="button"
                    onClick={() => {
                      setSelectedBizId(entry.business._id);
                      setEditingBizId(null);
                    }}
                    className="w-full text-left rounded-xl border border-slate-200 bg-white p-3 flex flex-wrap items-center justify-between gap-2 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {entry.business.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {entry.business.industry || entry.business.abn || 'Associated company'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      Relationship: <strong className="text-blue-700">{entry.link.role}</strong>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-1">
        <button
          type="button"
          onClick={() => {
            setShowAttachPanel((v) => !v);
            setShowAddPersonPanel(false);
          }}
          className="w-full min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50/60 hover:border-blue-300 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Attach to business</span>
        </button>

        {activeEntry && (
          <button
            type="button"
            onClick={() => {
              setShowAddPersonPanel((v) => !v);
              setShowAttachPanel(false);
            }}
            className="w-full min-h-10 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50/60 hover:border-blue-300 flex items-center justify-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add person</span>
          </button>
        )}
      </div>

      {/* Inline Drawer: Attach to Business */}
      {showAttachPanel && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="font-bold text-slate-900">Attach {lead.name} to a business</h5>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setAttachMode('existing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  attachMode === 'existing' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Existing company
              </button>
              <button
                type="button"
                onClick={() => setAttachMode('new')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  attachMode === 'new' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                New company
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="font-semibold text-slate-700">
              Person&apos;s role at company
              <input
                type="text"
                placeholder="e.g. Director, Fleet Manager"
                value={attachRole}
                onChange={(e) => setAttachRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold text-slate-700 pt-4 sm:pt-5">
              <input
                type="checkbox"
                checked={attachPrimary}
                onChange={(e) => setAttachPrimary(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <span>Set as primary contact</span>
            </label>
          </div>

          {attachMode === 'existing' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={bizSearch}
                  onChange={(e) => setBizSearch(e.target.value)}
                  placeholder="Search companies by name or ABN..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5">
                {bizResults.map((hit) => (
                  <div
                    key={hit._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{hit.name}</p>
                      {(hit.abn || hit.industry) && (
                        <p className="text-[11px] text-slate-500 truncate">
                          {[hit.abn ? `ABN ${hit.abn}` : '', hit.industry].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAttachExisting(hit)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
                    >
                      Attach
                    </button>
                  </div>
                ))}
                {!bizResults.length && (
                  <p className="text-slate-500 py-2">
                    No matching companies found. Switch to &ldquo;New company&rdquo; to create one.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleAttachNew} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="font-semibold text-slate-700 sm:col-span-2">
                  Company name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beruld Transport Pty Ltd"
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="font-semibold text-slate-700">
                  ABN
                  <input
                    type="text"
                    placeholder="45 672 389 514"
                    value={newBizAbn}
                    onChange={(e) => setNewBizAbn(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
              </div>
              <label className="block font-semibold text-slate-700">
                Industry / description
                <input
                  type="text"
                  placeholder="e.g. Non-operating holding company"
                  value={newBizIndustry}
                  onChange={(e) => setNewBizIndustry(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachPanel(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !newBizName.trim()}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Create &amp; attach
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Inline Drawer: Add Person to Business */}
      {showAddPersonPanel && activeEntry && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="font-bold text-slate-900">Add person to {activeEntry.business.name}</h5>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPersonMode('existing')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  personMode === 'existing' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                Existing client
              </button>
              <button
                type="button"
                onClick={() => setPersonMode('new')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  personMode === 'new' ? 'bg-blue-600 text-white' : 'text-slate-600'
                }`}
              >
                New person
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="font-semibold text-slate-700">
              Role at {activeEntry.business.name}
              <input
                type="text"
                placeholder="e.g. Fleet Manager, Accounts Manager"
                value={personRole}
                onChange={(e) => setPersonRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
              />
            </label>
            <label className="flex items-center gap-2 font-semibold text-slate-700 pt-4 sm:pt-5">
              <input
                type="checkbox"
                checked={personPrimary}
                onChange={(e) => setPersonPrimary(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              <span>Set as primary contact</span>
            </label>
          </div>

          {personMode === 'existing' ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                  placeholder="Search clients by name, mobile or email..."
                  className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2"
                />
              </div>
              <div className="max-h-44 overflow-y-auto space-y-1.5">
                {personResults.map((candidate) => (
                  <div
                    key={candidate._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{candidate.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {[candidate.phone, candidate.email].filter(Boolean).join(' · ') || 'No contact details'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleAddPerson(candidate._id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shrink-0"
                    >
                      Add
                    </button>
                  </div>
                ))}
                {!personResults.length && (
                  <p className="text-slate-500 py-2">
                    No matching clients found. Switch to &ldquo;New person&rdquo; to create a contact.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddPerson();
              }}
              className="space-y-2.5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="font-semibold text-slate-700">
                  Full name *
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Thompson"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="font-semibold text-slate-700">
                  Mobile number *
                  <input
                    type="tel"
                    placeholder="0438 765 432"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
                <label className="font-semibold text-slate-700">
                  Email
                  <input
                    type="email"
                    placeholder="sarah@company.com"
                    value={personEmail}
                    onChange={(e) => setPersonEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPersonPanel(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !personName.trim() || (!personPhone.trim() && !personEmail.trim())}
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Create &amp; add person
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>All changes are saved automatically.</span>
      </p>
    </div>
  );
}
