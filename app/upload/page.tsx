import Link from 'next/link';
import { headers } from 'next/headers';
import PublicUploadForm from '@/components/PublicUploadForm';
import { getSiteSettings } from '@/lib/site-settings';

export default async function PublicUploadPage() {
  const requestHeaders = headers();
  const siteSettings = await getSiteSettings();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload to ACE Studio</h1>
            <p className="text-gray-600">
              Submit your content for review and distribution on the ACE platform.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <PublicUploadForm />
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-800">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}