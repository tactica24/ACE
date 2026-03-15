import { DashboardShell, SideNav } from '@/components/DashboardShell';
import UploadForm from '@/components/UploadForm';

export default function UploadPage() {
  return (
    <DashboardShell
      title="Upload a new release"
      description="Choose your rights tier, set pricing, and publish for review."
      sideNav={
        <SideNav
          active="/studio/upload"
          items={[
            { href: '/studio', label: 'Overview' },
            { href: '/studio/upload', label: 'Upload' },
            { href: '/studio/library', label: 'Library' },
            { href: '/studio/contracts', label: 'Contracts' }
          ]}
        />
      }
    >
      <div className="card">
        <UploadForm />
      </div>
    </DashboardShell>
  );
}




