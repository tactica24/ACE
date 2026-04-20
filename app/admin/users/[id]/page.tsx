import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import AdminAccountControlPanel from '@/components/AdminAccountControlPanel';
import AdminCommerceSupportPanel from '@/components/AdminCommerceSupportPanel';
import AdminCreatorAccessLinks from '@/components/AdminCreatorAccessLinks';
import AdminCreatorProfileEditor from '@/components/AdminCreatorProfileEditor';
import AdminDisclosureSection from '@/components/AdminDisclosureSection';
import AdminProducerVideoManager from '@/components/AdminProducerVideoManager';
import ApproveCreatorButton from '@/components/ApproveCreatorButton';
import PromoteAdminButton from '@/components/PromoteAdminButton';
import { DashboardShell, SideNav } from '@/components/DashboardShell';
import { getAdminNavItems } from '@/lib/admin-nav';
import { requireAdminUser } from '@/lib/auth-page';
import { formatContractDate } from '@/lib/contracts';
import { formatCredits, getCreditsForNaira, storedUnitsToCredits } from '@/lib/credits';
import { prisma } from '@/lib/db';
import { formatRecordedCharge } from '@/lib/format';
import { getRegionalMoneyDisplay } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const adminUser = await requireAdminUser(`/admin/users/${params.id}`);
  const requestHeaders = headers();
  const formatMoney = (amountNaira: number) => getRegionalMoneyDisplay(requestHeaders, amountNaira).label;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      wallet: true,
      creator: {
        include: {
          contracts: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
              video: {
                select: { title: true }
              }
            }
          },
          payoutRequests: {
            orderBy: { requestedAt: 'desc' },
            take: 10
          },
          settlements: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { video: { select: { title: true } } }
          }
        }
      },
      supportTickets: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      supportActionsReceived: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          adminUser: {
            select: { email: true }
          }
        }
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 20
      },
      videos: {
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          videoType: true,
          releaseYear: true,
          createdAt: true,
          series: {
            select: {
              title: true
            }
          },
          seasonNumber: true,
          episodeNumber: true,
          technicalMetadata: {
            select: {
              trailerKey: true
            }
          }
        }
      },
      unlocks: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { video: { select: { title: true } } }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const creatorSettlements = user.creator?.settlements ?? [];

  return (
    <DashboardShell
      title={user.creator?.displayName ?? user.name ?? user.email}
      description="Admin support view for producer corrections, approvals, finance tracing, and issue resolution."
      sideNav={
        <SideNav
          active="/admin/users"
          items={getAdminNavItems()}
        />
      }
      actions={
        <div className="action-list">
          <PromoteAdminButton userId={user.id} email={user.email} role={user.role} />
          {user.signupIntent === 'CREATOR' || user.creator ? (
            <Link className="btn btn-ghost" href={`/admin/upload?producerId=${encodeURIComponent(user.id)}`}>Upload for producer</Link>
          ) : null}
          <Link className="btn btn-ghost" href={`mailto:${user.email}`}>Email user</Link>
          <Link className="btn btn-ghost" href="/admin/users">Back to users</Link>
        </div>
      }
    >
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="card">
          <h3>Account summary</h3>
          <div className="stack-list">
            <span className="muted">Email: {user.email}</span>
            <span className="muted">Phone: {user.phone}</span>
            <span className="muted">Role: {user.role}</span>
            <span className="muted">Signup intent: {user.signupIntent}</span>
            <span className="muted">Producer access: {user.creatorAccessStatus}</span>
            <span className="muted">Viewer wallet: {formatMoney(user.wallet?.balanceNaira ?? 0)}</span>
            <span className="muted">Wallet value: {formatCredits(getCreditsForNaira(user.wallet?.balanceNaira ?? 0))}</span>
            <span className="muted">Viewer credits: {formatCredits(storedUnitsToCredits(user.wallet?.credits ?? 0))}</span>
          </div>
        </div>

        <AdminAccountControlPanel
          userId={user.id}
          email={user.email}
          role={user.role}
          signupIntent={user.signupIntent}
          creatorAccessStatus={user.creatorAccessStatus}
          hasCreatorProfile={Boolean(user.creator)}
          isCurrentAdmin={adminUser.sub === user.id}
        />

        <div className="card">
          <h3>Producer account</h3>
          {user.creator ? (
            <div className="stack-list">
              <span className="muted">Producer number: {user.creator.creatorNumber ?? 'Pending'}</span>
              <span className="muted">Display name: {user.creator.displayName}</span>
              <span className="muted">Producer wallet: {formatMoney(user.creator.earningsBalanceNaira)}</span>
              <span className="muted">Verified: {user.creator.verified ? 'Yes' : 'No'}</span>
              <span className="muted">Address: {user.creator.address ?? 'Not provided'}</span>
              <span className="muted">ID number: {user.creator.idCardNumber ?? 'Not provided'}</span>
              <span className="muted">Bank: {user.creator.bankName ?? 'Not provided'}</span>
              <span className="muted">Bank account name: {user.creator.bankAccountName ?? 'Not provided'}</span>
              <span className="muted">Bank account number: {user.creator.bankAccountNumber ?? 'Not provided'}</span>
              <ApproveCreatorButton userId={user.id} approved={user.role === 'CREATOR'} />
              <AdminCreatorAccessLinks creatorUserId={user.id} />
            </div>
          ) : (
            <p className="muted">No producer profile on this account yet.</p>
          )}
        </div>
      </div>

      <div className="stack-list">
        <AdminDisclosureSection
          title="Producer operations"
          description="Open documents, correct onboarding data, and manage whether uploaded movies are visible to viewers."
          badge="Producer"
          defaultOpen
        >
          <div className="grid">
            <div className="card">
              <h3>Producer documents</h3>
              {user.creator?.contracts.length ? (
                <div className="stack-list">
                  {user.creator.contracts.map((contract) => (
                    <div key={contract.id} className="stack-row">
                      <div>
                        <strong>{contract.video.title}</strong>
                        <p className="muted">
                          Producer number: {user.creator?.creatorNumber ?? 'Pending'} | {contract.rightsTier}
                        </p>
                        <p className="muted">
                          {contract.producerAccepted
                            ? `Signed by ${contract.producerSignedName ?? 'producer'} on ${formatContractDate(contract.effectiveDate ?? contract.producerSignedAt)}`
                            : 'Awaiting producer signature'}
                        </p>
                      </div>
                      <a className="btn btn-ghost" href={`/api/studio/contracts/${contract.id}/download`}>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No stored producer documents yet.</p>
              )}
            </div>

            {(user.signupIntent === 'CREATOR' || user.creator) ? (
              <div className="card">
                <h3>Edit producer onboarding</h3>
                <AdminCreatorProfileEditor
                  userId={user.id}
                  initialValues={{
                    name: user.name ?? '',
                    phone: user.phone,
                    address: user.creator?.address ?? '',
                    idCardNumber: user.creator?.idCardNumber ?? '',
                    idCardUrl: user.creator?.idCardUrl ?? '',
                    bankName: user.creator?.bankName ?? '',
                    bankAccountNumber: user.creator?.bankAccountNumber ?? ''
                  }}
                />
              </div>
            ) : null}

            {user.signupIntent === 'CREATOR' || user.creator || user.videos.length ? (
              <div className="card">
                <h3>Producer movie availability</h3>
                <p className="muted">
                  Activate a movie to make it visible to viewers, or deactivate it to hide it without losing the upload.
                </p>
                <AdminProducerVideoManager
                  userId={user.id}
                  initialVideos={user.videos.map((video) => ({
                    id: video.id,
                    title: video.title,
                    status: video.status,
                    category: video.category,
                    videoType: video.videoType,
                    releaseYear: video.releaseYear,
                    createdAt: video.createdAt.toISOString(),
                    seriesTitle: video.series?.title ?? null,
                    seasonNumber: video.seasonNumber,
                    episodeNumber: video.episodeNumber,
                    trailerDownloadHref: video.technicalMetadata?.trailerKey
                      ? `/api/admin/videos/${video.id}/trailer`
                      : null
                  }))}
                />
              </div>
            ) : null}
          </div>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="Viewer commerce and recovery"
          description="Review payments, unlock history, and balance correction actions only when you need to intervene."
          badge="Commerce"
        >
          <div className="grid">
            <div className="card">
              <h3>Recent viewer wallet statements</h3>
              {user.payments.length ? (
                <div className="stack-list">
                  {user.payments.map((payment) => (
                    <div key={payment.id} className="stack-row">
                      <div>
                        <strong>{payment.reference}</strong>
                        <p className="muted">{payment.gateway} | {payment.status} | {payment.createdAt.toISOString().slice(0, 10)}</p>
                      </div>
                      <span>{`${formatRecordedCharge({ amountMinor: payment.amountMinor ?? payment.amountNaira * 100, amountNaira: payment.amountNaira, currency: payment.currency })} | ${formatCredits(getCreditsForNaira(payment.amountNaira))}`}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No wallet payment records yet.</p>
              )}
            </div>

            <div className="card">
              <h3>Recent movie unlocks</h3>
              {user.unlocks.length ? (
                <div className="stack-list">
                  {user.unlocks.map((unlock) => (
                    <div key={unlock.id} className="stack-row">
                      <div>
                        <strong>{unlock.video.title}</strong>
                        <p className="muted">{unlock.createdAt.toISOString().slice(0, 10)} | {unlock.source} | {formatCredits(getCreditsForNaira(unlock.amountNaira))}</p>
                      </div>
                      <span>{formatRecordedCharge({ amountMinor: unlock.amountMinor ?? unlock.amountNaira * 100, amountNaira: unlock.amountNaira, currency: unlock.currency })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No unlocks recorded yet.</p>
              )}
            </div>

            <AdminCommerceSupportPanel
              userId={user.id}
              wallet={{
                balanceNaira: user.wallet?.balanceNaira ?? 0,
                credits: storedUnitsToCredits(user.wallet?.credits ?? 0)
              }}
              recentPayments={user.payments.map((payment) => ({
                id: payment.id,
                reference: payment.reference,
                gateway: payment.gateway,
                status: payment.status,
                amountNaira: payment.amountNaira,
                amountMinor: payment.amountMinor,
                currency: payment.currency,
                createdAt: payment.createdAt.toISOString().slice(0, 10)
              }))}
              initialActions={user.supportActionsReceived.map((action) => ({
                id: action.id,
                actionType: action.actionType,
                amountNairaDelta: action.amountNairaDelta,
                creditsDelta: storedUnitsToCredits(action.creditsDelta),
                resultingBalanceNaira: action.resultingBalanceNaira,
                resultingCredits: action.resultingCredits === null ? null : storedUnitsToCredits(action.resultingCredits),
                note: action.note,
                createdAt: action.createdAt.toISOString().slice(0, 10),
                adminEmail: action.adminUser.email
              }))}
            />
          </div>
        </AdminDisclosureSection>

        <AdminDisclosureSection
          title="Support and producer finance history"
          description="Expand for recent tickets, settlement history, and payout requests tied to this account."
          badge="History"
        >
          <div className="grid">
            <div className="card">
              <h3>Recent support requests</h3>
              {user.supportTickets.length ? (
                <div className="stack-list">
                  {user.supportTickets.map((ticket) => (
                    <div key={ticket.id} className="stack-row">
                      <div>
                        <strong>{ticket.subject}</strong>
                        <p className="muted">{ticket.category} | {ticket.status}</p>
                      </div>
                      <span>{ticket.createdAt.toISOString().slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No support messages for this account yet.</p>
              )}
            </div>

            <div className="card">
              <h3>Recent producer earnings statements</h3>
              {creatorSettlements.length ? (
                <div className="stack-list">
                  {creatorSettlements.map((settlement) => (
                    <div key={settlement.id} className="stack-row">
                      <div>
                        <strong>{settlement.video.title}</strong>
                        <p className="muted">{settlement.createdAt.toISOString().slice(0, 10)}</p>
                      </div>
                      <span>{formatMoney(settlement.creatorNaira)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No producer settlement records yet.</p>
              )}
            </div>

            <div className="card">
              <h3>Producer payout requests</h3>
              {user.creator?.payoutRequests.length ? (
                <div className="stack-list">
                  {user.creator.payoutRequests.map((request) => (
                    <div key={request.id} className="stack-row">
                      <div>
                        <strong>{formatMoney(request.amountNaira)}</strong>
                        <p className="muted">{request.requestedAt.toISOString().slice(0, 10)} | {request.status}</p>
                      </div>
                      <span className="muted">{request.bankName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No producer payout requests yet.</p>
              )}
            </div>
          </div>
        </AdminDisclosureSection>
      </div>
    </DashboardShell>
  );
}
