'use client';

export default function AdminReportPrintButton({ label = 'Print monthly PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => window.print()}
    >
      {label}
    </button>
  );
}
