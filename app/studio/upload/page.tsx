import { DashboardShell, SideNav } from '@/components/DashboardShell';
import UploadForm from '@/components/UploadForm';
import { requireCreatorUser } from '@/lib/auth-page';

export default async function UploadPage() {
  await requireCreatorUser('/studio/upload');

  return (
    <DashboardShell
      title="Upload a new release"
      description="Enter the same title, artwork, pricing, and runtime details that will appear in review and on the storefront."
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
