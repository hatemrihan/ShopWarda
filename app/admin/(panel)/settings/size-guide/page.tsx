'use client';

import React, { useState, useEffect } from 'react';
import { Ruler, Plus, Trash2, GripVertical, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SizeGuideColumn {
  key: string;
  label: string;
}

interface SizeGuideRow {
  size: string;
  values: Record<string, string>;
}

interface SizeGuideData {
  enabled: boolean;
  title: string;
  description: string;
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
  notes: string;
}

export default function SizeGuidePage() {
  const [data, setData] = useState<SizeGuideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);



  useEffect(() => {
    let ignore = false;
    fetch('/api/admin/settings/size-guide')
      .then((res) => res.json())
      .then((json) => {
        if (!ignore) {
          setData(
            json.sizeGuide ?? {
              enabled: true,
              title: 'Arrangement Size Guide',
              description: '',
              columns: [],
              rows: [],
              notes: '',
            }
          );
        }
      })
      .catch(() => {
        if (!ignore) toast.error('Failed to load size guide');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/size-guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      const json = await res.json();
      setData(json.sizeGuide);
      toast.success('Size guide saved');
    } catch {
      toast.error('Failed to save size guide');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof SizeGuideData>(key: K, value: SizeGuideData[K]) => {
    setData((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const addColumn = () => {
    if (!data) return;
    const key = `col_${Date.now()}`;
    updateField('columns', [...data.columns, { key, label: 'New Column' }]);
    // Add empty values for new column in all rows
    updateField('rows', data.rows.map((r) => ({
      ...r,
      values: { ...r.values, [key]: '' },
    })));
  };

  const removeColumn = (index: number) => {
    if (!data) return;
    const col = data.columns[index];
    updateField('columns', data.columns.filter((_, i) => i !== index));
    updateField('rows', data.rows.map((r) => {
      const newValues = { ...r.values };
      delete newValues[col.key];
      return { ...r, values: newValues };
    }));
  };

  const updateColumnLabel = (index: number, label: string) => {
    if (!data) return;
    const cols = [...data.columns];
    cols[index] = { ...cols[index], label };
    updateField('columns', cols);
  };

  const addRow = () => {
    if (!data) return;
    const emptyValues: Record<string, string> = {};
    data.columns.forEach((c) => (emptyValues[c.key] = ''));
    updateField('rows', [...data.rows, { size: 'New Size', values: emptyValues }]);
  };

  const removeRow = (index: number) => {
    if (!data) return;
    updateField('rows', data.rows.filter((_, i) => i !== index));
  };

  const updateRowSize = (index: number, size: string) => {
    if (!data) return;
    const rows = [...data.rows];
    rows[index] = { ...rows[index], size };
    updateField('rows', rows);
  };

  const updateCellValue = (rowIndex: number, colKey: string, value: string) => {
    if (!data) return;
    const rows = [...data.rows];
    rows[rowIndex] = {
      ...rows[rowIndex],
      values: { ...rows[rowIndex].values, [colKey]: value },
    };
    updateField('rows', rows);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-white/30" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-white leading-none">Size Guide</h1>
          <p className="text-[11px] text-white/25 mt-1.5">
            Configure the arrangement size guide shown on product pages
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-[11px] text-white/70 hover:text-white transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Enable Toggle */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-white/30" />
            <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
              Display Settings
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={data.enabled}
              onChange={(e) => updateField('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/50 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500/40 peer-checked:after:bg-green-400" />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <label className="text-[10px] text-white/25 block mb-1.5">Title</label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => updateField('title', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20"
              placeholder="Arrangement Size Guide"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/25 block mb-1.5">Description</label>
            <input
              type="text"
              value={data.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20"
              placeholder="Choose the perfect bouquet size for any occasion."
            />
          </div>
        </div>
      </div>

      {/* Columns Configuration */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
            Columns
          </span>
          <button
            onClick={addColumn}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-[10px] text-white/50 hover:text-white/70 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Column
          </button>
        </div>

        {data.columns.length === 0 ? (
          <p className="text-[12px] text-white/20 py-4 text-center">
            No columns configured. Add columns to build your size guide table.
          </p>
        ) : (
          <div className="space-y-1.5">
            {data.columns.map((col, i) => (
              <div key={col.key} className="flex items-center gap-2 group">
                <GripVertical className="h-3 w-3 text-white/10 shrink-0" />
                <input
                  type="text"
                  value={col.label}
                  onChange={(e) => updateColumnLabel(i, e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-[12px] text-white/70 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={() => removeColumn(i)}
                  className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rows / Table Editor */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium">
            Size Rows
          </span>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.10] text-[10px] text-white/50 hover:text-white/70 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Row
          </button>
        </div>

        {data.rows.length === 0 ? (
          <p className="text-[12px] text-white/20 py-4 text-center">
            No size rows configured.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2 px-2 text-[9px] text-white/20 uppercase tracking-wider font-medium w-8" />
                  <th className="py-2 px-2 text-[9px] text-white/20 uppercase tracking-wider font-medium min-w-[100px]">
                    Size
                  </th>
                  {data.columns.map((col) => (
                    <th
                      key={col.key}
                      className="py-2 px-2 text-[9px] text-white/20 uppercase tracking-wider font-medium min-w-[120px]"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="py-2 px-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] group"
                  >
                    <td className="py-1.5 px-2">
                      <GripVertical className="h-3 w-3 text-white/10" />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.size}
                        onChange={(e) => updateRowSize(ri, e.target.value)}
                        className="w-full bg-transparent border-none text-[12px] text-white/70 focus:outline-none font-medium"
                      />
                    </td>
                    {data.columns.map((col) => (
                      <td key={col.key} className="py-1.5 px-2">
                        <input
                          type="text"
                          value={row.values[col.key] ?? ''}
                          onChange={(e) => updateCellValue(ri, col.key, e.target.value)}
                          className="w-full bg-transparent border-none text-[12px] text-white/50 focus:outline-none focus:text-white/70"
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="py-1.5 px-2">
                      <button
                        onClick={() => removeRow(ri)}
                        className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <span className="text-[11px] text-white/40 uppercase tracking-wider font-medium block mb-3">
          Notes / Care Tips
        </span>
        <textarea
          value={data.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-2 text-[13px] text-white/80 placeholder:text-white/15 focus:outline-none focus:border-white/20 resize-none"
          placeholder="Additional notes shown below the size guide table..."
        />
      </div>
    </div>
  );
}
