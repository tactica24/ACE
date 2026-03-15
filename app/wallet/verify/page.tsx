import VerifyPayment from '@/components/VerifyPayment';

export default function VerifyPage({ searchParams }: { searchParams: { reference?: string } }) {
  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 480 }}>
        <div className="card">
          <h2>Payment verification</h2>
          <VerifyPayment reference={searchParams.reference ?? null} />
          <div style={{ marginTop: 12 }}>
            <a className="btn btn-ghost" href="/wallet">Return to wallet</a>
          </div>
        </div>
      </div>
    </div>
  );
}




