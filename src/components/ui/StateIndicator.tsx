import React from 'react';
import { Loader2, AlertTriangle, Inbox, RefreshCw } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullPage?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...', fullPage = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-xl text-center space-y-md select-none animate-fade-in">
      <Loader2 className="w-[32px] h-[32px] text-primary animate-spin" />
      <span className="text-body-spec font-medium text-ink-muted80 tracking-tight">{message}</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-canvas/80 backdrop-blur-sm z-50 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  title = 'Something went wrong', 
  message, 
  onRetry 
}) => {
  return (
    <div className="max-w-[420px] mx-auto my-lg p-xl bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/20 rounded-lg flex flex-col items-center text-center space-y-md animate-scale-up">
      <div className="w-[44px] h-[44px] rounded-full bg-red-100 dark:bg-red-900/25 flex items-center justify-center text-red-600 dark:text-red-400">
        <AlertTriangle className="w-[20px] h-[20px]" />
      </div>
      <div className="space-y-xs">
        <h3 className="text-body-strong font-bold text-ink">{title}</h3>
        <p className="text-caption-spec text-ink-muted64 leading-tight">{message}</p>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="apple-btn-secondary py-[8px] px-[16px] text-[13px] font-semibold flex items-center gap-xs hover:border-red-300 active:scale-95 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
};

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There is currently no data matches this selection.',
  icon,
  action
}) => {
  return (
    <div className="py-[64px] px-lg border border-dashed border-hairline rounded-lg flex flex-col items-center text-center space-y-md max-w-[480px] mx-auto animate-fade-in select-none">
      <div className="text-ink-muted32">
        {icon || <Inbox className="w-[48px] h-[48px] stroke-[1.2]" />}
      </div>
      <div className="space-y-xxs">
        <h3 className="text-body-strong font-semibold text-ink">{title}</h3>
        <p className="text-caption-spec text-ink-muted48 leading-tight max-w-[280px] mx-auto">{description}</p>
      </div>
      {action && (
        <div className="pt-xs">
          {action}
        </div>
      )}
    </div>
  );
};
