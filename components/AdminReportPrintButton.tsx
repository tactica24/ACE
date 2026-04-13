'use client';

export default function AdminReportPrintButton() {
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => window.print()}
    >
      Print monthly PDF
    </button>
  );
}
