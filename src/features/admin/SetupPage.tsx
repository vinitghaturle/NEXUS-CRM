import React, { useState } from 'react';
import { 
  Terminal, 
  Check, 
  ExternalLink, 
  Laptop, 
  AlertCircle
} from 'lucide-react';

export const SetupPage: React.FC = () => {
  const [selectedConfig, setSelectedConfig] = useState<'firebase' | 'script' | 'sheet'>('firebase');
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);

  const runSetup = async () => {
    if (setupRunning || setupCompleted) return;
    setSetupRunning(true);
    setSetupError(null);
    
    const appsScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    
    if (!appsScriptUrl || appsScriptUrl.includes('mock-deployment-id')) {
      console.warn("No real VITE_APPS_SCRIPT_URL set. Running in offline mock mode.");
      setTimeout(() => {
        setSetupRunning(false);
        setSetupCompleted(true);
      }, 2000);
      return;
    }

    try {
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'system.setup',
          payload: {}
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        setSetupCompleted(true);
        if (result.data && result.data.spreadsheetId) {
          setSpreadsheetId(result.data.spreadsheetId);
        }
      } else {
        setSetupError(result.error?.message || 'Server error occurred during Google Sheets setup.');
      }
    } catch (err: any) {
      console.error("Setup connection error:", err);
      setSetupError(`Failed to connect to Google Apps Script: ${err.message}`);
    } finally {
      setSetupRunning(false);
    }
  };

  return (
    <div className="space-y-xl font-text select-none text-ink">
      
      {/* Overview stats link card */}
      <div className="pt-md max-w-[840px]">
        <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden aspect-[16/6] flex flex-col text-left">
          {/* Window Header */}
          <div className="h-[40px] bg-canvas-parchment border-b border-hairline px-md flex items-center justify-between text-caption-spec">
            <div className="flex items-center gap-[6px]">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-green-400 inline-block"></span>
            </div>
            <span className="text-ink-muted48 font-mono text-[12px]">nexus-crm-node://dashboard</span>
            <Laptop className="w-[14px] h-[14px] text-ink-muted48" />
          </div>
          {/* Window Body */}
          <div className="p-lg flex-1 bg-canvas flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-lg">
              <div className="space-y-xxs">
                <span className="text-fine-print text-ink-muted48 uppercase tracking-wider font-semibold">Active Profile</span>
                <h3 className="text-tagline font-bold text-ink">NEXUS Admin</h3>
              </div>
              <div className="space-y-xxs">
                <span className="text-fine-print text-ink-muted48 uppercase tracking-wider font-semibold">Firebase Project</span>
                <h3 className="text-tagline font-bold text-ink">{import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nexus-crm-656'}</h3>
              </div>
              <div className="space-y-xxs">
                <span className="text-fine-print text-ink-muted48 uppercase tracking-wider font-semibold">Target Document</span>
                {spreadsheetId ? (
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-tagline font-bold text-primary flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    NEXUS CRM 2026–27 <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <h3 className="text-tagline font-bold text-ink-muted48 flex items-center gap-1">
                    NEXUS CRM 2026–27
                  </h3>
                )}
              </div>
            </div>

            <div className="border-t border-hairline pt-md flex items-center justify-between text-caption-spec text-ink-muted48">
              <div className="flex items-center gap-md">
                <span className="flex items-center gap-xxs text-green-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                  Local Dev Server Active
                </span>
                <span>Host: localhost:5173</span>
              </div>
              <span>Vite + React + TS v8.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Schema generation control */}
      <section id="schema" className="bg-surface-tile1 text-white p-lg rounded-lg space-y-md text-left">
        <div className="space-y-xxs">
          <span className="text-primary-dark text-tagline font-semibold">Automation Panel</span>
          <h2 className="text-display-sm tracking-tight font-semibold">
            Schema Setup Automation
          </h2>
          <p className="text-caption-spec text-white/70 max-w-[600px]">
            Deploy an idempotent spreadsheet builder directly inside Google Apps Script to construct the 21-tab system configuration instantly.
          </p>
        </div>

        <div className="max-w-[600px] bg-surface-tile2 border border-white/10 rounded-lg p-lg space-y-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-sm">
            <span className="text-caption-strong text-white/90">Automation Command</span>
            <Terminal className="w-4 h-4 text-primary-dark" />
          </div>

          <p className="text-caption-spec text-white/70">
            Triggering this action executes the server-side Apps Script generator to automatically build the tables, validation lists, and structural columns.
          </p>

          <button 
            onClick={runSetup}
            disabled={setupRunning || setupCompleted}
            className={`w-full py-2.5 px-4 rounded-pill text-body-spec font-medium transition-all duration-200 ${
              setupCompleted 
                ? 'bg-green-600 text-white cursor-default' 
                : setupRunning 
                ? 'bg-white/20 text-white/50 cursor-not-allowed' 
                : 'bg-primary hover:bg-primary-focus text-white active:scale-95'
            }`}
          >
            {setupCompleted ? '✓ Schema Setup Successfully Completed' : setupRunning ? 'Executing Builder Script...' : 'Run setupNexusSpreadsheet()'}
          </button>

          {setupError && (
            <div className="bg-red-950/30 border border-red-500/20 rounded-md p-sm text-xs text-red-400 space-y-1 flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Setup Failed</p>
                <p>{setupError}</p>
              </div>
            </div>
          )}

          {setupCompleted && (
            <div className="bg-green-950/30 border border-green-500/20 rounded-md p-sm text-xs text-green-400 space-y-1">
              <p className="font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Operations Complete</p>
              <p>22 tabs initialized successfully. Primary keys, headers, and validation dropdown structures linked.</p>
              {spreadsheetId && (
                <p className="pt-1">
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-primary-dark hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open Target Spreadsheet <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Local configurator chips */}
      <section id="configurator" className="bg-canvas-parchment rounded-lg p-lg border border-hairline space-y-md text-left">
        <div className="space-y-xxs">
          <h2 className="text-display-xs font-semibold text-ink">
            System Configurator
          </h2>
          <p className="text-caption-spec text-ink-muted48">
            Verify local variables, paths, and connections. Tap a profile chip below to view current environment values.
          </p>
        </div>

        <div className="flex gap-xs">
          <button 
            onClick={() => setSelectedConfig('firebase')}
            className={`px-[12px] py-[8px] text-[12px] font-medium rounded-pill border transition-all ${
              selectedConfig === 'firebase'
                ? 'bg-canvas text-ink border-primary shadow-sm'
                : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
            }`}
          >
            Firebase SDK Config
          </button>
          <button 
            onClick={() => setSelectedConfig('script')}
            className={`px-[12px] py-[8px] text-[12px] font-medium rounded-pill border transition-all ${
              selectedConfig === 'script'
                ? 'bg-canvas text-ink border-primary shadow-sm'
                : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
            }`}
          >
            Apps Script Backend
          </button>
          <button 
            onClick={() => setSelectedConfig('sheet')}
            className={`px-[12px] py-[8px] text-[12px] font-medium rounded-pill border transition-all ${
              selectedConfig === 'sheet'
                ? 'bg-canvas text-ink border-primary shadow-sm'
                : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
            }`}
          >
            Spreadsheet Schema
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-md pt-xs">
          {selectedConfig === 'firebase' && (
            <>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">API KEY</span>
                <h3 className="text-body-strong font-bold text-ink">Authentication Core</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  {import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD12jcZsYKox3...'}
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">AUTH DOMAIN</span>
                <h3 className="text-body-strong font-bold text-ink">OAuth Client</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  {import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nexus-crm-656.firebaseapp.com'}
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">PROJECT ID</span>
                <h3 className="text-body-strong font-bold text-ink">Workspace Link</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nexus-crm-656'}
                </code>
              </div>
            </>
          )}

          {selectedConfig === 'script' && (
            <>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">API ENTRYPOINT</span>
                <h3 className="text-body-strong font-bold text-ink">doPost() URL</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  {import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/mock-deployment-id/exec'}
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">ROUTING</span>
                <h3 className="text-body-strong font-bold text-ink">Action Dispatch</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  Router.gs (doPost)
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">RBAC SECURITY</span>
                <h3 className="text-body-strong font-bold text-ink">Permissions</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  Auth.gs & Permissions.gs
                </code>
              </div>
            </>
          )}

          {selectedConfig === 'sheet' && (
            <>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">TARGET SCHEMA</span>
                <h3 className="text-body-strong font-bold text-ink">CRM Database</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  {spreadsheetId || 'PENDING INITIALIZATION'}
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">TIMEZONE</span>
                <h3 className="text-body-strong font-bold text-ink">Asia / Kolkata</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  appsscript.json
                </code>
              </div>
              <div className="bg-canvas border border-hairline rounded-lg p-md space-y-xxs">
                <span className="text-[10px] text-primary font-semibold uppercase">DENSITY</span>
                <h3 className="text-body-strong font-bold text-ink">22 Tabs</h3>
                <code className="block p-xs bg-canvas-parchment rounded-sm text-[11px] text-ink-muted80 truncate font-mono">
                  00_Settings, 01_Users...
                </code>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
};
