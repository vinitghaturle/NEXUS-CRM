import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, description }) => {
  const { profile } = useAuth();

  return (
    <div className="space-y-lg select-none">
      
      {/* Title block */}
      <div className="border-b border-hairline pb-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
        <div className="space-y-xxs">
          <h1 className="text-display-md font-semibold tracking-tight text-ink">{title}</h1>
          <p className="text-body-spec text-ink-muted48 leading-tight">{description}</p>
        </div>

        {/* Access tag */}
        <div className="inline-flex items-center gap-xs bg-green-50 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/25 text-green-700 dark:text-green-400 py-xs px-sm rounded-md self-start sm:self-center text-button-utility">
          <ShieldCheck className="w-4 h-4" />
          <span>Role Entitlement: {profile?.role}</span>
        </div>
      </div>

      {/* Frame placeholder box */}
      <div className="bg-canvas border border-dashed border-hairline rounded-lg p-xl flex flex-col items-center justify-center text-center py-[120px] space-y-sm">
        <span className="w-12 h-12 rounded-full bg-ink-muted8 border border-hairline flex items-center justify-center text-ink-muted32 text-display-xs font-mono font-bold">
          ?
        </span>
        <div className="space-y-xxs max-w-[320px]">
          <h3 className="text-body-strong font-semibold text-ink">Under Construction</h3>
          <p className="text-caption-spec text-ink-muted48 leading-tight">
            This module is scheduled for development in the next phase. Navigation and RBAC checking is fully functional.
          </p>
        </div>
      </div>

    </div>
  );
};
