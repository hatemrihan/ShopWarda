'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, ShoppingCart, Search, ChevronDown, Package, Eye,
  Download, FileText, FileSpreadsheet, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── Types ─────────────────────────────────────────────────────

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  attributes?: Record<string, string>;
  image?: string;
};

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  items: OrderItem[];
  subtotal: number;
  shipping_cost: number;
  cod_fee: number;
  total: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_status: string;
  payment_screenshot?: string | null;
  shipping_address: {
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
  } | null;
  governorate: string | null;
  notes: string | null;
  created_at: string;
};

type ManualOrderItem = {
  name: string;
  price: number;
  quantity: number;
  attributes: string;   // free-text: "Weight: 500g, Flavor: Vanilla"
};

type ManualOrderForm = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  governorate: string;
  city: string;
  notes: string;
  paymentMethod: 'cashOnDelivery' | 'instaPay';
  shippingCost: number;
  codFee: number;
  items: ManualOrderItem[];
};

// ── Constants ─────────────────────────────────────────────────

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  shipped: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/20',
  processing: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
};

const EMPTY_ITEM: ManualOrderItem = { name: '', price: 0, quantity: 1, attributes: '' };

const EMPTY_FORM: ManualOrderForm = {
  customerName: '', customerPhone: '', customerEmail: '',
  address: '', governorate: '', city: '', notes: '',
  paymentMethod: 'cashOnDelivery', shippingCost: 0, codFee: 0,
  items: [{ ...EMPTY_ITEM }],
};

// ── Helpers ───────────────────────────────────────────────────

function renderItemAttrs(item: OrderItem): string {
  if (item.attributes && Object.keys(item.attributes).length > 0) {
    return Object.entries(item.attributes).map(([k, v]) => `${k}: ${v}`).join(' / ');
  }
  return [item.color, item.size].filter(Boolean).join(' / ');
}

function renderNotesWithLinks(text?: string | null) {
  if (!text) return '-';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <div className="min-w-[150px] whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.match(urlRegex) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer"
            className="text-white underline hover:opacity-80"
            onClick={e => e.stopPropagation()}>
            Link
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

function buildExportRows(orders: Order[]) {
  return orders.map(o => ({
    'Order #': o.order_number,
    'Date': new Date(o.created_at).toLocaleDateString('en-GB'),
    'Customer': o.customer_name,
    'Phone': o.customer_phone ?? '',
    'Email': o.customer_email ?? '',
    'Governorate': o.governorate ?? '',
    'City': o.shipping_address?.city ?? '',
    'Address': o.shipping_address?.address ?? '',
    'Items': (o.items ?? []).map(i => {
      const attrs = renderItemAttrs(i);
      return `${i.quantity}x ${i.name}${attrs ? ` (${attrs})` : ''}`;
    }).join('; '),
    'Subtotal': o.subtotal,
    'Shipping': o.shipping_cost,
    'COD Fee': o.cod_fee,
    'Total': o.total,
    'Currency': o.currency,
    'Payment Method': o.payment_method === 'cashOnDelivery' ? 'Cash on Delivery' : 'InstaPay',
    'Payment Status': o.payment_status,
    'Status': o.status,
    'Notes': o.notes ?? '',
  }));
}

async function exportToDOC(orders: Order[]) {
  const rows = buildExportRows(orders);
  const columns = Object.keys(rows[0] ?? {});

  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><title>Orders Report</title></head><body>';
  html += '<h1>Orders Report</h1>';
  html += '<table border="1" style="border-collapse: collapse; width: 100%;">';
  html += '<thead><tr>' + columns.map(c => `<th style="text-align: left; padding: 5px;">${c}</th>`).join('') + '</tr></thead>';
  html += '<tbody>';
  rows.forEach(r => {
    html += '<tr>' + columns.map(c => `<td style="padding: 5px;">${r[c as keyof typeof r] ?? ''}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table></body></html>';

  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Export handlers ───────────────────────────────────────────

async function exportToExcel(orders: Order[]) {
  const rows = buildExportRows(orders);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  let table = '<table border="1"><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
  rows.forEach(r => {
    table += '<tr>' + headers.map(h => `<td>${r[h as keyof typeof r] ?? ''}</td>`).join('') + '</tr>';
  });
  table += '</tbody></table>';

  const blob = new Blob(['\ufeff', table], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToCSV(orders: Order[]) {
  const rows = buildExportRows(orders);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToPDF(orders: Order[]) {
  const rows = buildExportRows(orders);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Orders Report</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
          h1 { font-size: 20px; margin-bottom: 5px; }
          p { font-size: 12px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
        </style>
      </head>
      <body>
        <h1>Orders Report</h1>
        <p>Generated: ${new Date().toLocaleString('en-GB')} — ${orders.length} orders</p>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${headers.map(h => `<td>${r[h as keyof typeof r] ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Manual order dialog
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState<ManualOrderForm>(EMPTY_FORM);
  const [submittingManual, setSubmittingManual] = useState(false);

  // ── Fetch ────────────────────────────────────────────────

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) setOrders(data.orders ?? []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data.success) {
          setOrders(data.orders ?? []);
        }
      })
      .catch(() => {
        if (mounted) toast.error('Failed to load orders');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // ── Status update ────────────────────────────────────────

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const toastId = toast.loading('Updating status…');
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`Status → ${newStatus}`, { id: toastId, duration: 2000 });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update', { id: toastId });
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Delete order #${orderNumber}? This will permanently remove it from the database.`)) return;
    const toastId = toast.loading('Deleting order…');
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Order deleted', { id: toastId, duration: 2000 });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete', { id: toastId });
    }
  };

  // ── Export ───────────────────────────────────────────────

  const handleExport = async (format: 'excel' | 'csv' | 'pdf' | 'doc') => {
    if (filtered.length === 0) { toast.error('No orders to export'); return; }
    setExporting(true);
    const toastId = toast.loading(`Exporting ${format.toUpperCase()}…`);
    try {
      if (format === 'excel') await exportToExcel(filtered);
      if (format === 'csv') await exportToCSV(filtered);
      if (format === 'pdf') await exportToPDF(filtered);
      if (format === 'doc') await exportToDOC(filtered);
      toast.success(`Exported ${filtered.length} orders`, { id: toastId, duration: 2000 });
    } catch (err) {
      console.error('[Export]', err);
      toast.error('Export failed', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  // ── Manual order ─────────────────────────────────────────

  const updateManualItem = (index: number, field: keyof ManualOrderItem, value: string | number) => {
    setManualForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addManualItem = () => setManualForm(prev => ({
    ...prev, items: [...prev.items, { ...EMPTY_ITEM }],
  }));

  const removeManualItem = (index: number) => setManualForm(prev => ({
    ...prev, items: prev.items.filter((_, i) => i !== index),
  }));

  const manualSubtotal = manualForm.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const manualTotal =
    manualSubtotal +
    manualForm.shippingCost +
    (manualForm.paymentMethod === 'cashOnDelivery' ? manualForm.codFee : 0);

  const submitManualOrder = async () => {
    if (!manualForm.customerName.trim() || !manualForm.customerPhone.trim()) {
      toast.error('Customer name and phone are required');
      return;
    }
    if (manualForm.items.some((i) => !i.name.trim())) {
      toast.error('All items must have a name');
      return;
    }

    setSubmittingManual(true);
    const toastId = toast.loading('Creating order…');

    try {
      const res = await fetch('/api/orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: manualForm.customerName.trim(),
          customerPhone: manualForm.customerPhone.trim(),
          customerEmail: manualForm.customerEmail.trim() || undefined,
          shippingAddress: {
            address: manualForm.address,
            city: manualForm.city,
          },
          governorate: manualForm.governorate.trim() || undefined,
          items: manualForm.items.map((i) => ({
            productId: 'manual',
            name: i.name.trim(),
            price: i.price,
            quantity: i.quantity,
            attributes: i.attributes.trim()
              ? Object.fromEntries(
                i.attributes
                  .split(',')
                  .map((pair) => {
                    const [k, ...v] = pair.split(':');
                    return [k?.trim() ?? pair, v.join(':').trim()];
                  })
                  .filter(([k]) => k),
              )
              : undefined,
          })),
          subtotal: manualSubtotal,
          shippingCost: manualForm.shippingCost,
          codFee: manualForm.paymentMethod === 'cashOnDelivery' ? manualForm.codFee : 0,
          totalAmount: manualTotal,
          paymentMethod: manualForm.paymentMethod,
          notes: manualForm.notes.trim() || undefined,
          status: 'confirmed',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`Order #${data.order.orderId} created`, { id: toastId, duration: 3000 });
      setShowManual(false);
      setManualForm(EMPTY_FORM);
      fetchOrders();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order', { id: toastId });
    } finally {
      setSubmittingManual(false);
    }
  };

  // ── Filtered orders ──────────────────────────────────────

  const searchLower = search.toLowerCase();
  const filtered = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchLower) ||
      o.customer_name.toLowerCase().includes(searchLower) ||
      (o.customer_phone ?? '').includes(search),
  );

  // ── Loading ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          <span className="text-[13px] text-white/30">Loading orders…</span>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="text-white max-w-[1400px] mt-2">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[13px] text-white/30 mb-1">Sales</div>
          <h1 className="text-xl font-semibold text-white">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-white/30 mr-2">{orders.length} total</span>

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={exporting || orders.length === 0}
              className="h-8 px-3 text-[12px] text-white/60 border border-white/[0.08] hover:text-white hover:bg-white/[0.04] gap-1.5 inline-flex items-center justify-center rounded-md font-medium cursor-pointer transition-colors disabled:opacity-50"
            >
              {exporting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />
              }
              Export
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#111] border-white/[0.08] min-w-[160px]">
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.04] text-[13px] gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-400" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('csv')}
                className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.04] text-[13px] gap-2 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.04] text-[13px] gap-2 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-red-400" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('doc')}
                className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.04] text-[13px] gap-2 cursor-pointer"
              >
                <FileText className="h-3.5 w-3.5 text-blue-300" />
                Word (.doc)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Manual order button */}
          <Button
            size="sm"
            onClick={() => setShowManual(true)}
            className="h-8 px-3 text-[12px] bg-white text-stone-900 hover:bg-stone-200 font-medium gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Manual Order
          </Button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-5">
            <ShoppingCart className="h-7 w-7 text-white/20" />
          </div>
          <h2 className="text-[15px] font-medium text-white/60 mb-1.5">No orders yet</h2>
          <p className="text-[13px] text-white/25 text-center max-w-sm">
            Customer orders will appear here. You can also add manual orders from WhatsApp or phone.
          </p>
        </div>
      ) : (
        <>
          {/* ── Search ───────────────────────────── */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
            <Input
              placeholder="Search by order number, customer name, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/[0.03] border-white/[0.06] text-white placeholder:text-white/25 focus-visible:ring-white/20 h-10"
            />
          </div>

          {/* ── Table ────────────────────────────── */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden pb-1">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    {[
                      'Order', 'Date', 'Customer', 'Phone', 'Email',
                      'Governorate', 'City', 'Address', 'Location',
                      'Items', 'Subtotal', 'Shipping', 'COD Fee', 'Total',
                      'Payment', 'Pay Status', 'Notes', 'Status', '',
                    ].map(h => (
                      <TableHead key={h} className="text-[11px] text-white/25 uppercase tracking-wider font-medium px-5 py-3 whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => (
                    <TableRow
                      key={order.id}
                      className="border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setViewOrder(order)}
                    >
                      <TableCell className="px-5 py-3 text-[13px] text-white/70 font-mono whitespace-nowrap">
                        #{order.order_number}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[12px] text-white/30 tabular-nums whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px] text-white/80">
                        {order.customer_name}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px] text-white/40">
                        {order.customer_phone || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px] text-white/40">
                        {order.customer_email || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-white/40 whitespace-nowrap">
                        {order.governorate || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-white/40 whitespace-nowrap">
                        {order.shipping_address?.city || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[13px] text-white/70 min-w-[220px]">
                        {order.shipping_address?.address || '-'}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px]">
                        {order.shipping_address?.lat && order.shipping_address?.lng ? (
                          <a
                            href={`https://www.google.com/maps?q=${order.shipping_address.lat},${order.shipping_address.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 underline hover:text-blue-300 font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Maps
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      {/* Items column */}
                      <TableCell className="px-5 py-3 min-w-[260px]">
                        <div className="flex flex-col gap-1.5">
                          {(order.items ?? []).map((item, i) => {
                            const attrs = renderItemAttrs(item);
                            return (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-[11px] text-white/30 tabular-nums shrink-0 mt-px">
                                  ×{item.quantity}
                                </span>
                                <div>
                                  <span className="text-[12px] text-white/70">
                                    {item.name}
                                  </span>
                                  {attrs && (
                                    <span className="text-[11px] text-white/30 ml-1">
                                      ({attrs})
                                    </span>
                                  )}
                                  <span className="text-[11px] text-white/30 ml-1 tabular-nums">
                                    — {(item.price * item.quantity).toLocaleString()} {order.currency}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>

                      <TableCell className="px-5 py-3 text-right text-[13px] text-white/40 tabular-nums">
                        {(order.subtotal ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right text-[13px] text-white/40 tabular-nums">
                        {(order.shipping_cost ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right text-[13px] text-white/40 tabular-nums">
                        {(order.cod_fee ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-right text-[13px] font-semibold text-white tabular-nums whitespace-nowrap">
                        {order.total.toLocaleString()} {order.currency}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px] text-white/40 capitalize">
                        {order.payment_method === 'cashOnDelivery' ? 'COD' : 'InstaPay'}
                      </TableCell>
                      <TableCell className="px-5 py-3 whitespace-nowrap text-[13px] text-white/40">
                        {order.payment_status === 'proof_uploaded' || order.payment_status === 'proof uploaded' || order.payment_status === 'image' ? (
                          order.payment_screenshot ? (
                            <a
                              href={order.payment_screenshot}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-400 underline hover:text-blue-300 font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              image
                            </a>
                          ) : (
                            <span className="text-blue-400 underline font-medium">image</span>
                          )
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-3 text-[12px] text-white/40">
                        {renderNotesWithLinks(order.notes)}
                      </TableCell>

                      {/* Status dropdown */}
                      <TableCell className="px-5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={updatingId === order.id}
                            className={`h-7 px-2.5 text-[11px] font-medium rounded border ${STATUS_COLOR[order.status] ?? STATUS_COLOR.pending} hover:opacity-80 inline-flex items-center justify-center cursor-pointer transition-colors`}
                          >
                            {updatingId === order.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <>{order.status}<ChevronDown className="h-3 w-3 ml-1" /></>
                            }
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#111] border-white/[0.08]">
                            {STATUSES.map(s => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => updateStatus(order.id, s)}
                                className="text-white/70 hover:text-white focus:text-white focus:bg-white/[0.04] text-[13px] capitalize cursor-pointer"
                              >
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-5 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => setViewOrder(order)}
                            className="h-7 w-7 text-white/30 hover:text-white hover:bg-white/[0.04]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            onClick={() => deleteOrder(order.id, order.order_number)}
                            className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {filtered.length === 0 && search && (
            <div className="text-center py-12">
              <Search className="h-6 w-6 text-white/20 mx-auto mb-3" />
              <p className="text-[13px] text-white/30">No orders match &quot;{search}&quot;</p>
            </div>
          )}
        </>
      )}

      {/* ── Order detail dialog ───────────────────────── */}
      <Dialog open={!!viewOrder} onOpenChange={(o) => { if (!o) setViewOrder(null); }}>
        <DialogContent className="bg-[#111] border-white/[0.08] text-white sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Order #{viewOrder?.order_number}</DialogTitle>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-5 py-2">
              {/* Customer */}
              <div>
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Customer</span>
                <div className="text-[13px] text-white/80 mt-1">{viewOrder.customer_name}</div>
                {viewOrder.customer_email && <div className="text-[12px] text-white/40">{viewOrder.customer_email}</div>}
                {viewOrder.customer_phone && <div className="text-[12px] text-white/40">{viewOrder.customer_phone}</div>}
                {viewOrder.shipping_address?.address && (
                  <div className="text-[12px] text-white/70 mt-0.5">
                    {viewOrder.shipping_address.address}
                  </div>
                )}
                {viewOrder.governorate && (
                  <div className="text-[12px] text-white/40 mt-0.5">
                    {viewOrder.governorate}{viewOrder.shipping_address?.city ? `, ${viewOrder.shipping_address.city}` : ''}
                  </div>
                )}
                {viewOrder.shipping_address?.lat && viewOrder.shipping_address?.lng && (
                  <a
                    href={`https://www.google.com/maps?q=${viewOrder.shipping_address.lat},${viewOrder.shipping_address.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] text-blue-400 underline hover:text-blue-300 mt-1.5 inline-flex items-center gap-1.5 font-medium"
                  >
                    View location on Google Maps ↗
                  </a>
                )}
              </div>

              {/* Items */}
              <div>
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Items</span>
                <div className="mt-2 space-y-2">
                  {(viewOrder.items ?? []).map((item, i) => (
                    <div key={i} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0 gap-4">
                      <div className="flex items-start gap-2.5">
                        <Package className="h-4 w-4 text-white/20 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[13px] text-white/80">{item.name}</div>
                          {item.attributes && Object.keys(item.attributes).length > 0 ? (
                            <div className="text-[11px] text-white/30 space-y-0.5 mt-0.5">
                              {Object.entries(item.attributes).map(([key, val]) => (
                                <div key={key}>{key}: {val}</div>
                              ))}
                            </div>
                          ) : (item.color || item.size) && (
                            <div className="text-[11px] text-white/30 mt-0.5">
                              {[item.color, item.size].filter(Boolean).join(' - ')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[13px] text-white font-medium tabular-nums">
                          {(item.price * item.quantity).toLocaleString()} {viewOrder.currency}
                        </div>
                        <div className="text-[11px] text-white/30">
                          {item.price.toLocaleString()} × {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-white/[0.06] pt-3 space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/40">Subtotal</span>
                  <span className="text-white/70 tabular-nums">{viewOrder.subtotal.toLocaleString()} {viewOrder.currency}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/40">Shipping</span>
                  <span className="text-white/70 tabular-nums">{viewOrder.shipping_cost.toLocaleString()} {viewOrder.currency}</span>
                </div>
                {viewOrder.cod_fee > 0 && (
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/40">COD Fee</span>
                    <span className="text-white/70 tabular-nums">{viewOrder.cod_fee.toLocaleString()} {viewOrder.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px] font-semibold pt-1.5 border-t border-white/[0.06]">
                  <span className="text-white">Total</span>
                  <span className="text-white tabular-nums">{viewOrder.total.toLocaleString()} {viewOrder.currency}</span>
                </div>
              </div>

              {viewOrder.notes && (
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Notes</span>
                  <p className="text-[13px] text-white/50 mt-1 whitespace-pre-wrap">{viewOrder.notes}</p>
                </div>
              )}

              {viewOrder.payment_screenshot && (
                <div>
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Payment Proof</span>
                  <a href={viewOrder.payment_screenshot} target="_blank" rel="noreferrer" className="block mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewOrder.payment_screenshot}
                      alt="Payment proof screenshot"
                      className="rounded-lg border border-white/[0.08] max-h-64 w-auto object-contain hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manual order dialog ───────────────────────── */}
      <Dialog open={showManual} onOpenChange={(o) => { if (!o) { setShowManual(false); setManualForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-[#111] border-white/[0.08] text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add Manual Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Customer info */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3">Customer</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Name *</label>
                  <Input value={manualForm.customerName}
                    onChange={e => setManualForm(p => ({ ...p, customerName: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="Customer name" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Phone *</label>
                  <Input value={manualForm.customerPhone}
                    onChange={e => setManualForm(p => ({ ...p, customerPhone: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="01xxxxxxxxx" dir="ltr" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Email</label>
                  <Input value={manualForm.customerEmail}
                    onChange={e => setManualForm(p => ({ ...p, customerEmail: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="optional" dir="ltr" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Governorate</label>
                  <Input value={manualForm.governorate}
                    onChange={e => setManualForm(p => ({ ...p, governorate: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="e.g. Cairo" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">City</label>
                  <Input value={manualForm.city}
                    onChange={e => setManualForm(p => ({ ...p, city: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="e.g. Maadi" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Address</label>
                  <Input value={manualForm.address}
                    onChange={e => setManualForm(p => ({ ...p, address: e.target.value }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="Street, bldg, etc." />
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">Items</p>
                <button type="button" onClick={addManualItem} className="text-[11px] text-white/60 hover:text-white transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add item
                </button>
              </div>
              <div className="space-y-3">
                {manualForm.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <Input value={item.name} onChange={e => updateManualItem(idx, 'name', e.target.value)}
                          className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-[12px]" placeholder="Item name *" />
                      </div>
                      <div>
                        <Input type="number" min={0} value={item.price || ''} onChange={e => updateManualItem(idx, 'price', Number(e.target.value))}
                          className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-[12px]" placeholder="Price EGP" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} value={item.quantity} onChange={e => updateManualItem(idx, 'quantity', Number(e.target.value))}
                          className="bg-white/[0.03] border-white/[0.06] text-white h-8 text-[12px] w-16" placeholder="Qty" />
                        {manualForm.items.length > 1 && (
                          <button type="button" onClick={() => removeManualItem(idx)} className="text-red-400/40 hover:text-red-400 transition-colors p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <Input value={item.attributes} onChange={e => updateManualItem(idx, 'attributes', e.target.value)}
                      className="bg-white/[0.03] border-white/[0.06] text-white h-7 text-[11px]" placeholder="Attributes (e.g. Size: Large, Color: Red)" />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment & Fees */}
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-3">Payment & Fees</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Payment Method</label>
                  <select value={manualForm.paymentMethod}
                    onChange={e => setManualForm(p => ({ ...p, paymentMethod: e.target.value as 'cashOnDelivery' | 'instaPay' }))}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-md px-3 h-9 text-[12px] text-white focus:outline-none"
                  >
                    <option value="cashOnDelivery">Cash on Delivery</option>
                    <option value="instaPay">InstaPay</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">Shipping (EGP)</label>
                  <Input type="number" min={0} value={manualForm.shippingCost || ''}
                    onChange={e => setManualForm(p => ({ ...p, shippingCost: Number(e.target.value) }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="0" />
                </div>
                <div>
                  <label className="text-[11px] text-white/40 mb-1 block">COD Fee (EGP)</label>
                  <Input type="number" min={0} value={manualForm.codFee || ''}
                    onChange={e => setManualForm(p => ({ ...p, codFee: Number(e.target.value) }))}
                    className="bg-white/[0.03] border-white/[0.06] text-white h-9 text-[13px]" placeholder="0" />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] text-white/40 mb-1 block">Notes / Links</label>
              <textarea value={manualForm.notes} onChange={e => setManualForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5 text-white text-[12px] focus:outline-none" rows={2} placeholder="Delivery instructions or link" />
            </div>

            {/* Summary */}
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] flex justify-between items-center text-[13px]">
              <span className="text-white/40">Total Amount:</span>
              <span className="text-white font-bold text-[15px]">{manualTotal.toLocaleString()} EGP</span>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <Button type="button" variant="ghost" onClick={() => setShowManual(false)} className="text-white/40 hover:bg-white/[0.04] text-[13px]">
                Cancel
              </Button>
              <Button type="button" disabled={submittingManual} onClick={submitManualOrder} className="bg-white text-stone-900 hover:bg-stone-200 text-[13px] font-medium">
                {submittingManual && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                Create Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
