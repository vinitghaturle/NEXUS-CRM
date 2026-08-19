import { useState } from 'react'
import { 
  Shield, 
  Database, 
  Terminal, 
  Layers, 
  Check, 
  Server, 
  Search, 
  ShoppingBag,
  ExternalLink,
  Laptop
} from 'lucide-react'

function App() {
  const [selectedConfig, setSelectedConfig] = useState<'firebase' | 'script' | 'sheet'>('firebase')
  const [setupRunning, setSetupRunning] = useState(false)
  const [setupCompleted, setSetupCompleted] = useState(false)

  const runMockSetup = () => {
    if (setupRunning || setupCompleted) return
    setSetupRunning(true)
    setTimeout(() => {
      setSetupRunning(false)
      setSetupCompleted(true)
    }, 2500)
  }

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text selection:bg-primary/20 selection:text-primary">
      
      {/* 1. Global Navigation Bar (True Black, Height 44px) */}
      <nav className="h-[44px] bg-surface-black text-white flex items-center justify-between px-lg z-50 sticky top-0 text-nav-link select-none">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-xl">
            {/* Logo */}
            <span className="font-display font-semibold tracking-tight text-white flex items-center gap-xxs cursor-pointer hover:opacity-80">
              <span className="w-[14px] h-[14px] rounded-full border-2 border-white inline-block"></span>
              NEXUS
            </span>
            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-[20px] text-white/80">
              <a href="#hero" className="hover:text-white transition duration-150">Overview</a>
              <a href="#schema" className="hover:text-white transition duration-150">Schema</a>
              <a href="#configurator" className="hover:text-white transition duration-150">Configurator</a>
              <a href="#script" className="hover:text-white transition duration-150">Apps Script</a>
              <a href="#legal" className="hover:text-white transition duration-150">Legal</a>
            </div>
          </div>
          {/* Right Action Icons */}
          <div className="flex items-center gap-lg text-white/80">
            <Search className="w-[15px] h-[15px] cursor-pointer hover:text-white transition" />
            <ShoppingBag className="w-[15px] h-[15px] cursor-pointer hover:text-white transition" />
          </div>
        </div>
      </nav>

      {/* 2. Sub Navigation Bar (Frosted Canvas-Parchment, Height 52px) */}
      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md border-b border-hairline sticky top-[44px] z-40 flex items-center justify-between px-lg select-none">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between">
          <span className="text-tagline font-semibold text-ink">NEXUS CRM</span>
          <div className="flex items-center gap-md">
            <span className="hidden sm:inline text-button-utility text-ink-muted48">Version 2026–27 (Active)</span>
            <a 
              href="#configurator" 
              className="apple-btn-dark-utility text-[12px] py-[6px] px-[12px]"
            >
              Verify Config
            </a>
          </div>
        </div>
      </nav>

      {/* 3. TILE 1: Light Hero Tile (Pure White, Full-Bleed) */}
      <section id="hero" className="bg-canvas py-section px-lg border-b border-hairline flex flex-col items-center text-center relative overflow-hidden">
        <div className="max-w-[980px] w-full mx-auto space-y-xl z-10">
          
          <div className="space-y-sm">
            <h1 className="text-responsive-hero tracking-apple-hero leading-[1.07] font-semibold text-ink">
              NEXUS Operations System
            </h1>
            <p className="text-lead text-ink-muted48 max-w-[640px] mx-auto leading-tight">
              A high-fidelity academic management network built on Google Apps Script and Firebase.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap justify-center gap-md">
            <a href="#schema" className="apple-btn-primary">
              Explore Sheets Schema
            </a>
            <a href="#configurator" className="apple-btn-secondary">
              Configure Node
            </a>
          </div>

          {/* Photographic/Vector Dashboard Render with Single Drop Shadow */}
          <div className="pt-xl max-w-[840px] mx-auto">
            <div className="bg-canvas border border-hairline rounded-lg shadow-product-surface overflow-hidden aspect-[16/10] flex flex-col text-left">
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
                    <h3 className="text-tagline font-bold text-ink">nexus-crm-656</h3>
                  </div>
                  <div className="space-y-xxs">
                    <span className="text-fine-print text-ink-muted48 uppercase tracking-wider font-semibold">Target Document</span>
                    <h3 className="text-tagline font-bold text-ink text-primary flex items-center gap-1 cursor-pointer">
                      NEXUS CRM 2026–27 <ExternalLink className="w-3.5 h-3.5" />
                    </h3>
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

        </div>
      </section>

      {/* 4. TILE 2: Dark Product Tile (Near-Black, Full-Bleed) */}
      <section id="schema" className="bg-surface-tile1 text-white py-section px-lg flex flex-col items-center text-center relative overflow-hidden">
        <div className="max-w-[980px] w-full mx-auto space-y-xl z-10">
          
          <div className="space-y-sm">
            <span className="text-primary-dark text-tagline font-semibold">Phase 1 Readiness</span>
            <h2 className="text-display-lg tracking-apple-hero font-semibold">
              Schema Setup Automation
            </h2>
            <p className="text-body-spec text-white/70 max-w-[600px] mx-auto">
              Deploy an idempotent spreadsheet builder directly inside Google Apps Script to construct the 21-tab system configuration instantly.
            </p>
          </div>

          <div className="max-w-[600px] mx-auto bg-surface-tile2 border border-white/10 rounded-lg p-lg text-left space-y-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-sm">
              <span className="text-caption-strong text-white/90">Automation Command</span>
              <Terminal className="w-4 h-4 text-primary-dark" />
            </div>

            <p className="text-caption-spec text-white/70">
              Triggering this action executes the server-side Apps Script generator to automatically build the tables, validation lists, and structural columns.
            </p>

            <button 
              onClick={runMockSetup}
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

            {setupCompleted && (
              <div className="bg-green-950/30 border border-green-500/20 rounded-md p-sm text-xs text-green-400 space-y-1">
                <p className="font-semibold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Operations Complete</p>
                <p>21 sheets initialized successfully. Primary keys, headers, and validation dropdown structures linked.</p>
              </div>
            )}
          </div>

          {/* Features Grid representation */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md pt-md text-left">
            <div className="p-md bg-white/5 border border-white/10 rounded-md space-y-xs">
              <Database className="w-5 h-5 text-primary-dark" />
              <h4 className="text-caption-strong text-white">System Config</h4>
              <p className="text-[12px] text-white/60">Global system metadata, dropdown definitions, and schema rules.</p>
            </div>
            <div className="p-md bg-white/5 border border-white/10 rounded-md space-y-xs">
              <Shield className="w-5 h-5 text-primary-dark" />
              <h4 className="text-caption-strong text-white">Access Control</h4>
              <p className="text-[12px] text-white/60">Dynamic user accounts, Firebase mapping, and permission sets.</p>
            </div>
            <div className="p-md bg-white/5 border border-white/10 rounded-md space-y-xs">
              <Layers className="w-5 h-5 text-primary-dark" />
              <h4 className="text-caption-strong text-white">Admissions Flow</h4>
              <p className="text-[12px] text-white/60">Inquiry tracking, source analysis, and stage validation charts.</p>
            </div>
            <div className="p-md bg-white/5 border border-white/10 rounded-md space-y-xs">
              <Server className="w-5 h-5 text-primary-dark" />
              <h4 className="text-caption-strong text-white">Academics Logs</h4>
              <p className="text-[12px] text-white/60">Class records, master scheduling, and student performance rosters.</p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. TILE 3: Configurator Parchment Tile (Alternating Parchment background, Store Configurator grid) */}
      <section id="configurator" className="bg-canvas-parchment py-section px-lg border-b border-hairline flex flex-col items-center">
        <div className="max-w-[1440px] w-full mx-auto space-y-xl">
          
          <div className="text-center space-y-sm max-w-[640px] mx-auto">
            <h2 className="text-display-lg tracking-apple-hero font-semibold text-ink">
              System Configurator
            </h2>
            <p className="text-body-spec text-ink-muted48">
              Verify local variables, paths, and connections. Tap a profile chip below to view current environment values.
            </p>
          </div>

          {/* Config Selection Chips (Configurator pill chips) */}
          <div className="flex justify-center gap-xs">
            <button 
              onClick={() => setSelectedConfig('firebase')}
              className={`px-[16px] py-[12px] text-caption-spec font-medium rounded-pill border transition-all ${
                selectedConfig === 'firebase'
                  ? 'bg-canvas text-ink border-primary shadow-sm'
                  : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
              }`}
            >
              Firebase SDK Config
            </button>
            <button 
              onClick={() => setSelectedConfig('script')}
              className={`px-[16px] py-[12px] text-caption-spec font-medium rounded-pill border transition-all ${
                selectedConfig === 'script'
                  ? 'bg-canvas text-ink border-primary shadow-sm'
                  : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
              }`}
            >
              Apps Script Backend
            </button>
            <button 
              onClick={() => setSelectedConfig('sheet')}
              className={`px-[16px] py-[12px] text-caption-spec font-medium rounded-pill border transition-all ${
                selectedConfig === 'sheet'
                  ? 'bg-canvas text-ink border-primary shadow-sm'
                  : 'bg-canvas text-ink-muted48 border-hairline hover:bg-white/50'
              }`}
            >
              Spreadsheet Schema
            </button>
          </div>

          {/* Store Utility Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg pt-sm">
            {selectedConfig === 'firebase' && (
              <>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">API KEY</span>
                  <h3 className="text-body-strong text-ink">Authentication Core</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    AIzaSyD12jcZsYKox3...
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Resolved public identifier for Google Cloud Firebase gateway.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">AUTH DOMAIN</span>
                  <h3 className="text-body-strong text-ink">OAuth Handshake Client</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    nexus-crm-656.firebaseapp.com
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Secure redirect authorization domain for user logins.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">PROJECT ID</span>
                  <h3 className="text-body-strong text-ink">Firebase Workspace Link</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    nexus-crm-656
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Target server-side environment for custom permission verification.</p>
                </div>
              </>
            )}

            {selectedConfig === 'script' && (
              <>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">API ENTRYPOINT</span>
                  <h3 className="text-body-strong text-ink">Web App doPost() URL</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    https://script.google.com/macros/s/mock-deployment-id/exec
                  </code>
                  <p className="text-caption-spec text-ink-muted48">All client-server commands tunnel through this main endpoint.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">ROUTING HEADER</span>
                  <h3 className="text-body-strong text-ink">Action Dispatch Router</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    Router.gs (doPost)
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Interprets requests using standard schema action verbs.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">RBAC AUTHORIZATION</span>
                  <h3 className="text-body-strong text-ink">Auth.gs & Permissions.gs</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    Google Token Sign-in
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Secure role validation layer protecting Google Sheets databases.</p>
                </div>
              </>
            )}

            {selectedConfig === 'sheet' && (
              <>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">TARGET SCHEMA</span>
                  <h3 className="text-body-strong text-ink">NEXUS CRM — 2026–27</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    SPREADSHEET_ID (Config.gs)
                  </code>
                  <p className="text-caption-spec text-ink-muted48">The global single-sheet database for operations storage.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">TIMEZONE</span>
                  <h3 className="text-body-strong text-ink">Asia / Kolkata</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    appsscript.json
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Default workspace location zone to track log operations accurately.</p>
                </div>
                <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-sm hover:border-primary/40 transition">
                  <span className="text-fine-print text-primary font-semibold uppercase">TAB DENSITY</span>
                  <h3 className="text-body-strong text-ink">21 Sheets Setup</h3>
                  <code className="block p-xs bg-canvas-parchment rounded-sm text-[12px] text-ink-muted80 truncate font-mono">
                    config, dropdowns, staff, logs...
                  </code>
                  <p className="text-caption-spec text-ink-muted48">Complete operations ledger representing the schema framework.</p>
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      {/* 6. Footer (Parchment background, relaxed leading for dense links, legal fine print) */}
      <footer id="legal" className="bg-canvas-parchment text-ink-muted80 py-section px-lg border-t border-hairline select-none">
        <div className="max-w-[1440px] w-full mx-auto space-y-xl">
          
          {/* Dense link columns with 2.41 leading */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-lg text-left">
            <div>
              <h4 className="text-caption-strong text-ink pb-xs">System Area</h4>
              <ul className="text-dense-link flex flex-col">
                <li><a href="#hero" className="hover:underline hover:text-ink">Overview Dashboard</a></li>
                <li><a href="#schema" className="hover:underline hover:text-ink">Sheet Automation</a></li>
                <li><a href="#configurator" className="hover:underline hover:text-ink">Configurator Chip Grid</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-caption-strong text-ink pb-xs">Code & Architecture</h4>
              <ul className="text-dense-link flex flex-col">
                <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink flex items-center gap-xxs">Git Repository <ExternalLink className="w-3 h-3" /></a></li>
                <li><a href="https://script.google.com" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink flex items-center gap-xxs">Apps Script Console <ExternalLink className="w-3 h-3" /></a></li>
                <li><a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink flex items-center gap-xxs">Firebase Console <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-caption-strong text-ink pb-xs">Documentation</h4>
              <ul className="text-dense-link flex flex-col">
                <li><a href="https://react.dev" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink">React Docs</a></li>
                <li><a href="https://tailwindcss.com" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink">Tailwind CSS Docs</a></li>
                <li><a href="https://vite.dev" target="_blank" rel="noreferrer" className="hover:underline hover:text-ink">Vite Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-caption-strong text-ink pb-xs">NEXUS Network</h4>
              <ul className="text-dense-link flex flex-col">
                <li><a href="#hero" className="hover:underline hover:text-ink">Operations Group</a></li>
                <li><a href="#schema" className="hover:underline hover:text-ink">Academics Board</a></li>
                <li><a href="#configurator" className="hover:underline hover:text-ink">Admissions Core</a></li>
              </ul>
            </div>
          </div>

          <hr className="border-hairline" />

          {/* Legal Fine-Print */}
          <div className="space-y-sm text-fine-print text-ink-muted48 leading-relaxed">
            <p>
              1. This system, including all sub-configurations, schemas, and operational logs, is the proprietary property of the NEXUS Academic Session. Usage is subject to strict role-based access restrictions. Unauthorized scanning or connection attempts violate security policy.
            </p>
            <p>
              2. Firebase SDK keys provided in this environment are public identifiers meant for client integration. Direct modification of sheets database values is audited server-side via Google Apps Script entrypoint validations.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-sm pt-xs border-t border-hairline/60">
              <span className="text-micro-legal text-ink-muted48">
                NEXUS Forum &copy; 2026&ndash;27 | All Rights Reserved.
              </span>
              <div className="flex gap-md text-micro-legal text-ink-muted48">
                <span className="cursor-pointer hover:underline">Privacy Policy</span>
                <span className="cursor-pointer hover:underline">Terms of Setup</span>
                <span className="cursor-pointer hover:underline">Auditing Logs</span>
              </div>
            </div>
          </div>

        </div>
      </footer>

    </div>
  )
}

export default App
