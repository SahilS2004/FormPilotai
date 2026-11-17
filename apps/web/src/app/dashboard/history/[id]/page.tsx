'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CalendarClock, ExternalLink } from 'lucide-react';
import { FormFillHistoryRecord } from '@formpilot/shared';

export default function SubmittedFormResponsePage() {
  const params = useParams<{ id: string }>();
  const [record, setRecord] = useState<FormFillHistoryRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [when, setWhen] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/history?id=${encodeURIComponent(params.id)}`)
      .then(async (res) => {
        if (!res.ok) {
          setMissing(true);
          return;
        }
        const data = await res.json();
        setRecord(data.record || null);
        if (!data.record) setMissing(true);
      })
      .catch(() => setMissing(true));
  }, [params?.id]);

  const saveStatusReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!record || !when) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: record.url,
          title: `Check status: ${record.formTitle}`,
          deadlineTimestamp: new Date(when).toISOString(),
          reminderWindowMinutes: 0,
          autoActionPolicy: 'notify_only',
          tone: record.tone || 'professional',
          notes: `Check the status of the submitted form at ${record.url}`,
        }),
      });
      const data = await response.json();
      setNotice(response.ok
        ? 'Reminder saved. FormPilot will prompt you to open this website and check the status.'
        : (data.error || 'The reminder could not be saved.'));
      if (response.ok) setWhen('');
    } catch {
      setNotice('The reminder could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#080E21] text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-navy-800 dark:hover:text-cyan-300">
          <ArrowLeft size={14} />
          Back to workspace
        </Link>

        {missing && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8">
            <h1 className="text-lg font-bold">This submitted form is not in history.</h1>
          </section>
        )}

        {record && (
          <>
            <header className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Submitted form response</p>
              <h1 className="text-2xl font-bold text-navy-800 dark:text-white">{record.formTitle}</h1>
              <p suppressHydrationWarning className="text-sm text-slate-500 dark:text-slate-400">
                {record.domain} · {new Date(record.submittedAt).toLocaleString()} · {record.fields.length} answers
              </p>
              <a href={record.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 dark:text-cyan-300 hover:underline">
                Open the website
                <ExternalLink size={14} />
              </a>
            </header>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {record.fields.map((field, index) => (
                <div key={`${field.fieldId}-${index}`} className="px-5 py-4 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{field.question}</p>
                  <p className="text-sm text-navy-900 dark:text-slate-100 whitespace-pre-wrap">{field.answer}</p>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <CalendarClock size={18} className="text-cyan-600 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-navy-800 dark:text-white">Check the status later</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Set a time to come back to this website and see whether the application moved forward.
                  </p>
                </div>
              </div>
              <form onSubmit={saveStatusReminder} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="datetime-local"
                  required
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-navy-800 dark:bg-cyan-600 text-white disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save reminder'}
                </button>
              </form>
              {notice && <p className="text-xs text-slate-600 dark:text-slate-300">{notice}</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
