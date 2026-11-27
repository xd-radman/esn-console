/**
 * AccessPendingPage.jsx — Member Lockout / Access Approval Limbo Screen
 * Rendered in place of `/` and `/project/:projectId` whenever an authenticated
 * user has `role === 'member'` (`!isAdmin`). Prevents access to projects,
 * charts, or workspace data until an Admin promotes the account, while allowing
 * the user to re-check their role via `refreshProfile()` or sign out.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Info,
  LoaderCircle,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { resolveUserPermissions } from '../lib/roleHierarchy.js';

export default function AccessPendingPage() {
  const { user, profile, rolesMap, refreshProfile, signOut } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  // Tracks manual status refresh spinner and feedback when still awaiting approval
  const [isChecking, setIsChecking] = useState(false);
  const [checkedStillPending, setCheckedStillPending] = useState(false);

  const displayEmail = profile?.email || user?.email || '';

  // Keep browser tab title localized while on the access-pending screen
  useEffect(() => {
    document.title = t('limbo.pageTitle');
  }, [t]);

  // Re-fetch `public.profiles` & `public.roles` so role approval unlocks the app immediately
  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckedStillPending(false);
    try {
      const updated = await refreshProfile();
      const resolved = resolveUserPermissions(updated, rolesMap);
      if (!resolved.view_workspace) {
        setCheckedStillPending(true);
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Sign out cleanly and return to `/login`
  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <main className="limbo-stage">
      <article className="bento-card elevated limbo-card">
        <div className="limbo-icon-wrap" aria-hidden="true">
          <Clock size={24} strokeWidth={1.5} />
        </div>

        <div className="limbo-copy">
          <span className="mono-tag">{t('limbo.kicker')}</span>
          <h1 className="font-editorial limbo-title">{t('limbo.title')}</h1>
          <p className="limbo-subtitle">{t('limbo.subtitle')}</p>
        </div>

        {/* Account & current approval status summary strip */}
        <dl className="limbo-meta-strip">
          <div className="limbo-meta-cell">
            <dt className="font-mono-label">{t('limbo.accountLabel')}</dt>
            <dd className="limbo-meta-email">{displayEmail}</dd>
          </div>
          <div className="limbo-meta-cell">
            <dt className="font-mono-label">{t('limbo.statusLabel')}</dt>
            <dd className="limbo-meta-status">{t('limbo.statusPending')}</dd>
          </div>
        </dl>

        {/* Inline feedback when the user checks status and is still awaiting Admin approval */}
        {checkedStillPending && (
          <div className="limbo-notice" role="status" aria-live="polite">
            <Info size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('limbo.stillPending')}</span>
          </div>
        )}

        {/* Primary status re-check and Sign Out actions */}
        <div className="limbo-actions">
          <button
            type="button"
            className="btn primary limbo-check-btn"
            disabled={isChecking}
            onClick={handleCheckStatus}
          >
            {isChecking ? (
              <>
                <LoaderCircle
                  size={15}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="auth-spinner"
                />
                <span>{t('limbo.checking')}</span>
              </>
            ) : (
              <>
                <RefreshCw size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('limbo.checkBtn')}</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn ghost limbo-signout-btn"
            onClick={handleSignOut}
          >
            <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('auth.signOut')}</span>
          </button>
        </div>
      </article>
    </main>
  );
}
