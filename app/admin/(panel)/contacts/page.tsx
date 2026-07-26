'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Download, MoreHorizontal, CheckCircle, Clock, User,
  Search, Mail, Loader2, Archive,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ── Types ─────────────────────────────────────────────────────

interface ContactItem {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  status: string;
  createdAt: string;
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [respondingIds, setRespondingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setContacts(data.data ?? []);
      })
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [contacts, search, statusFilter]);

  // CSV export
  function exportCSV() {
    const rows = [
      ['Name', 'Email', 'Status', 'Date'],
      ...filtered.map((c) => [
        c.name,
        c.email,
        c.status,
        new Date(c.createdAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  }

  async function updateStatus(id: string, newStatus: string) {
    setRespondingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) =>
          prev.map((c) => ((c.id === id || c._id === id) ? { ...c, status: newStatus } : c))
        );
        toast.success(newStatus === 'responded' ? 'Marked as responded' : 'Contact archived');
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setRespondingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-white/20" />
      </div>
    );
  }

  const statuses = ['all', 'new', 'read', 'replied', 'archived'];

  return (
    <div className="text-white max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[13px] text-white/25 mb-1">Engagement</div>
          <h1 className="text-xl font-semibold text-white">Contacts</h1>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 h-9 rounded-md text-[13px] font-medium border border-white/[0.06] text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Empty */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <Mail className="h-7 w-7 text-white/15" />
          </div>
          <h2 className="text-[15px] font-medium text-white/60 mb-1.5">No contacts yet</h2>
          <p className="text-[13px] text-white/25 text-center max-w-sm">
            When customers submit the contact form, their messages will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
              <input
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-10 bg-white/[0.03] border border-white/[0.06] rounded-lg text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/[0.15] transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-md p-0.5">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all capitalize ${
                    statusFilter === s ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-[10px] text-white/20 uppercase tracking-wider font-medium px-5 py-3 text-left">Status</th>
                  <th className="text-[10px] text-white/20 uppercase tracking-wider font-medium px-5 py-3 text-left">Name</th>
                  <th className="text-[10px] text-white/20 uppercase tracking-wider font-medium px-5 py-3 text-left">Email</th>
                  <th className="text-[10px] text-white/20 uppercase tracking-wider font-medium px-5 py-3 text-left">Date</th>
                  <th className="w-10 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => {
                  const cid = contact.id || contact._id || '';
                  return (
                    <tr key={cid} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3">
                        <StatusBadge status={contact.status} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 text-[13px] text-white/70">
                          <User className="h-3.5 w-3.5 text-white/20" />
                          {contact.name}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-[13px] text-white/40 lowercase">{contact.email}</td>
                      <td className="px-5 py-3 text-[12px] text-white/25 tabular-nums whitespace-nowrap font-mono">
                        {new Date(contact.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 p-0 inline-flex items-center justify-center rounded text-white/20 hover:text-white/50 hover:bg-white/[0.04]">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#111] border-white/[0.08] text-white/60">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-white/20 text-[10px]">Actions</DropdownMenuLabel>
                              {contact.status !== 'replied' && contact.status !== 'archived' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => updateStatus(cid, 'responded')}
                                    disabled={respondingIds.has(cid)}
                                    className="text-green-400 focus:text-green-300 focus:bg-white/[0.04] cursor-pointer text-[12px]"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-2" />
                                    {respondingIds.has(cid) ? 'Marking…' : 'Mark Responded'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                                </>
                              )}
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(contact.email)}
                                className="focus:bg-white/[0.04] cursor-pointer text-[12px]"
                              >
                                Copy Email
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/[0.06]" />
                              <DropdownMenuItem
                                onClick={() => updateStatus(cid, 'archived')}
                                className="text-red-400 focus:text-red-300 focus:bg-white/[0.04] cursor-pointer text-[12px]"
                              >
                                <Archive className="h-3 w-3 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="h-24 text-center text-[13px] text-white/20">
                      No contacts match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="py-3 text-[11px] text-white/15">{filtered.length} contacts</div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-orange-400/[0.08] text-orange-400 border-orange-400/[0.15]',
    read: 'bg-blue-400/[0.08] text-blue-400 border-blue-400/[0.15]',
    replied: 'bg-green-400/[0.08] text-green-400 border-green-400/[0.15]',
    responded: 'bg-green-400/[0.08] text-green-400 border-green-400/[0.15]',
    archived: 'bg-white/[0.03] text-white/25 border-white/[0.06]',
    pending: 'bg-amber-400/[0.08] text-amber-400 border-amber-400/[0.15]',
  };
  const icons: Record<string, React.ReactNode> = {
    new: <Clock className="w-2.5 h-2.5 mr-1" />,
    pending: <Clock className="w-2.5 h-2.5 mr-1" />,
    read: <CheckCircle className="w-2.5 h-2.5 mr-1" />,
    replied: <CheckCircle className="w-2.5 h-2.5 mr-1" />,
    responded: <CheckCircle className="w-2.5 h-2.5 mr-1" />,
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[status] || styles.archived}`}>
      {icons[status]}
      {status}
    </span>
  );
}
