import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { callApi } from '../../services/api';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PWAInstallPrompt } from '../ui/PWAInstallPrompt';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { 
  Bell,
  Menu,
  X, 
  LayoutDashboard, 
  CalendarDays, 
  KanbanSquare, 
  Users, 
  Settings, 
  History, 
  Wallet, 
  TrendingUp, 
  Cake, 
  LogOut,
  ChevronRight,
  User as UserIcon,
  Image,
  Share2,
  MailOpen,
  Award,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  Folder,
  Trophy,
  FileText,
  Moon,
  Sun
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles: string[]; // Allowed roles (empty means all)
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export const AppShell: React.FC = () => {
  const { profile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Native Android & Capacitor lifecycle configuration
  useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: isDark ? '#1c1c1e' : '#ffffff' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    } catch {
      // Web fallback
    }

    let backHandle: any;
    try {
      backHandle = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        } else if (notifOpen) {
          setNotifOpen(false);
        } else if (window.location.pathname !== '/dashboard' && canGoBack) {
          navigate(-1);
        } else {
          CapApp.exitApp();
        }
      });
    } catch {
      // Web fallback
    }

    return () => {
      if (backHandle && typeof backHandle.then === 'function') {
        backHandle.then((h: any) => h.remove?.());
      }
    };
  }, [mobileMenuOpen, notifOpen, navigate]);

  // Fetch tasks for notifications
  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ['tasks'],
    queryFn: () => callApi('tasks.list'),
    enabled: !!profile?.userId,
  });

  // Calculate notifications
  const myTasks = tasks.filter(t => t.assignedTo === profile?.userId && t.status !== 'COMPLETED');
  const overdueNotifications = myTasks.filter(t => {
    if (!t.deadline) return false;
    const due = new Date(t.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).map(t => ({
    id: `overdue-${t.taskId}`,
    type: 'OVERDUE',
    message: `Task "${t.taskTitle}" is overdue!`,
    taskId: t.taskId
  }));

  const blockedNotifications = myTasks.filter(t => t.status === 'BLOCKED').map(t => ({
    id: `blocked-${t.taskId}`,
    type: 'BLOCKED',
    message: `Task "${t.taskTitle}" is BLOCKED!`,
    taskId: t.taskId
  }));

  const dueTodayNotifications = myTasks.filter(t => {
    if (!t.deadline) return false;
    const due = new Date(t.deadline).toDateString();
    const today = new Date().toDateString();
    return due === today;
  }).map(t => ({
    id: `duetoday-${t.taskId}`,
    type: 'DUETODAY',
    message: `Task "${t.taskTitle}" is due today!`,
    taskId: t.taskId
  }));

  const notifications = [...overdueNotifications, ...blockedNotifications, ...dueTodayNotifications];

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = profile?.role || 'MEMBER';
  const isMemberOnly = role === 'MEMBER' || role === 'GENERAL_MEMBER';

  // Navigation schema per V1 role structure
  const sections: SidebarSection[] = [
    {
      title: 'Core',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: []
        },
        {
          name: 'Events',
          path: '/events',
          icon: <CalendarDays className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: []
        },
        {
          // Members see "My Tasks" (task board pre-filtered to them), others see full Task Board
          name: isMemberOnly ? 'My Tasks' : 'Task Board',
          path: '/tasks',
          icon: <KanbanSquare className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: []
        },
        {
          name: 'Meetings',
          path: '/meetings',
          icon: <MessageSquare className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: []
        },
        {
          name: 'Teams',
          path: '/teams',
          icon: <Users className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['PRESIDENT', 'VP', 'ADMIN']
        }
      ]
    },
    {
      // Admin modules — only visible to ADMIN
      title: 'Advanced Modules',
      items: [
        {
          name: 'Budgets',
          path: '/budgets',
          icon: <Wallet className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Creative Briefs',
          path: '/creative',
          icon: <Image className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Social Planner',
          path: '/social',
          icon: <Share2 className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Newsletters',
          path: '/newsletter',
          icon: <MailOpen className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Birthdays',
          path: '/birthdays',
          icon: <Cake className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Achievements',
          path: '/achievements',
          icon: <Award className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Recognition Board',
          path: '/recognition',
          icon: <Trophy className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Forms Registry',
          path: '/forms',
          icon: <ClipboardList className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Issues Tracker',
          path: '/issues',
          icon: <AlertTriangle className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Documents Base',
          path: '/documents',
          icon: <Folder className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        }
      ]
    },
    {
      // Administration panel — only visible to ADMIN
      title: 'Administration',
      items: [
        {
          name: 'Users & Teams',
          path: '/admin/users',
          icon: <Users className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Evaluations',
          path: '/admin/evaluations',
          icon: <TrendingUp className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'System Reports',
          path: '/admin/reports',
          icon: <FileText className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Audit Log',
          path: '/admin/audit',
          icon: <History className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        },
        {
          name: 'Settings',
          path: '/admin/settings',
          icon: <Settings className="w-[18px] h-[18px] stroke-[1.5]" />,
          roles: ['ADMIN']
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-text text-ink">
      
      {/* 1. TOP NAVBAR (Sticky, safe-area adaptive) */}
      <header className="header-safe bg-canvas border-b border-hairline sticky top-0 z-40 flex items-center justify-between px-lg select-none">
        <div className="flex items-center gap-md">
          {/* Mobile hamburger toggle — shows full sidebar drawer */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden p-xs text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo brand */}
          <span className="font-display font-bold tracking-tight text-ink flex items-center gap-xs">
            <img src="/icons/icon-192x192.png" className="w-6 h-6 rounded object-contain shadow-xs" alt="NEXUS Logo" />
            <span className="hidden xs:inline">NEXUS CRM</span>
            <span className="xs:hidden">NEXUS</span>
          </span>
        </div>

        {/* User profile dropdown summary */}
        <div className="flex items-center gap-md relative">
          
          {/* Notifications bell button */}
          <div className="relative">
            <button 
              onClick={() => setNotifOpen(!notifOpen)}
              className="p-xs text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition relative flex items-center"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-[2px] right-[2px] w-2.5 h-2.5 bg-red-500 rounded-full border border-canvas"></span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-xs bg-canvas border border-hairline rounded-lg shadow-product-surface w-[280px] max-w-[calc(100vw-32px)] p-sm space-y-xs animate-scale-up z-50 text-left">
                <div className="flex justify-between items-center border-b border-hairline pb-xs">
                  <span className="font-bold text-[12px]">Notifications ({notifications.length})</span>
                  <button onClick={() => setNotifOpen(false)} className="text-[11px] text-primary hover:underline">Close</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="text-center py-md text-[12px] text-ink-muted32">All caught up! No active alerts.</div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto divide-y divide-hairline">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => {
                          setNotifOpen(false);
                          navigate('/tasks');
                        }}
                        className="py-xs cursor-pointer hover:bg-canvas-parchment/30 text-[11.5px] leading-snug text-ink flex gap-xxs"
                      >
                        <span className="shrink-0">
                          {n.type === 'OVERDUE' ? '🚨' : n.type === 'BLOCKED' ? '🚫' : '📅'}
                        </span>
                        <div>{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dark mode toggle button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-xs text-ink-muted48 hover:text-ink hover:bg-ink-muted8 rounded-md transition"
          >
            {theme === 'dark'
              ? <Sun className="w-[18px] h-[18px]" />
              : <Moon className="w-[18px] h-[18px]" />
            }
          </button>

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-caption-strong font-semibold text-ink leading-tight">{profile?.name}</span>
            <span className="text-[11px] text-ink-muted48 uppercase tracking-wider font-semibold">
              {role} {profile?.teamId ? `• TEAM ${profile.teamId.slice(-3)}` : ''}
            </span>
          </div>

          <div className="w-[34px] h-[34px] rounded-full bg-ink-muted8 border border-hairline flex items-center justify-center text-primary-focus">
            <UserIcon className="w-4 h-4" />
          </div>

          <button 
            onClick={handleLogout}
            title="Log Out"
            className="p-xs text-ink-muted32 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex relative">

        {/* 2. DESKTOP SIDEBAR PANEL (Width 240px, Hidden on mobile) */}
        <aside className="hidden md:flex flex-col w-[240px] border-r border-hairline bg-canvas sticky top-[56px] h-[calc(100vh-56px)] overflow-y-auto select-none p-md space-y-md">
          {sections.map(section => {
            const visibleSectionItems = section.items.filter(
              (item: SidebarItem) => item.roles.length === 0 || item.roles.includes(role)
            );
            if (visibleSectionItems.length === 0) return null;
            return (
              <div key={section.title} className="space-y-xxs">
                <h5 className="px-md text-[10px] font-bold text-ink-muted48 uppercase tracking-wider mb-xs">{section.title}</h5>
                <div className="space-y-xxs">
                  {visibleSectionItems.map((item: SidebarItem) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => 
                        `flex items-center justify-between px-md py-[8px] text-[13px] font-medium rounded-md transition-all ${
                          isActive 
                            ? 'bg-primary/8 text-primary shadow-sm font-semibold' 
                            : 'text-ink-muted80 hover:text-ink hover:bg-ink-muted8'
                        }`
                      }
                    >
                      <div className="flex items-center gap-sm">
                        {item.icon}
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="border-t border-hairline pt-md px-md text-micro-legal text-ink-muted32">
            NEXUS Admin CRM Console v2.0
          </div>
        </aside>

        {/* 3. MOBILE SIDEBAR DRAWER (Overlay, toggled by menu state) */}
        {mobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-canvas-parchment/60 backdrop-blur-sm z-30 transition-all duration-300 drawer-safe"
            onClick={closeMobileMenu}
          >
            <nav 
              className="w-[280px] h-full bg-canvas border-r border-hairline shadow-lg p-md flex flex-col justify-between animate-slide-right overflow-y-auto safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-md">
                {sections.map(section => {
                  const visibleSectionItems = section.items.filter(
                    (item: SidebarItem) => item.roles.length === 0 || item.roles.includes(role)
                  );
                  if (visibleSectionItems.length === 0) return null;
                  return (
                    <div key={section.title} className="space-y-xxs">
                      <h5 className="px-md text-[10px] font-bold text-ink-muted48 uppercase tracking-wider mb-xs">{section.title}</h5>
                      <div className="space-y-xxs">
                        {visibleSectionItems.map((item: SidebarItem) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={closeMobileMenu}
                            className={({ isActive }) => 
                              `flex items-center gap-sm px-md py-[10px] text-[13px] font-medium rounded-md transition-all ${
                                isActive 
                                  ? 'bg-primary/8 text-primary font-semibold shadow-sm' 
                                  : 'text-ink-muted80 hover:text-ink hover:bg-ink-muted8'
                              }`
                            }
                          >
                            {item.icon}
                            <span>{item.name}</span>
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-hairline pt-md text-micro-legal text-ink-muted32">
                NEXUS Admin CRM Console v2.0
              </div>
            </nav>
          </div>
        )}

        {/* 4. MAIN BODY CONTAINER (Flex expansion, padding margins) */}
        <main className="flex-1 bg-canvas p-[16px] sm:p-lg md:p-xl overflow-x-hidden relative main-safe md:pb-xl">
          <div className="max-w-[1200px] mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

      </div>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (PWA style, hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-canvas/95 backdrop-blur-md border-t border-hairline z-40 flex items-center justify-around px-xs py-xs bottom-nav-safe">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-[3px] px-sm py-xs rounded-lg transition-all min-w-[52px] ${
              isActive ? 'text-primary' : 'text-ink-muted48 hover:text-ink'
            }`
          }
        >
          <LayoutDashboard className="w-[22px] h-[22px] stroke-[1.5]" />
          <span className="text-[10px] font-semibold">Home</span>
        </NavLink>

        <NavLink
          to="/events"
          className={({ isActive }) =>
            `flex flex-col items-center gap-[3px] px-sm py-xs rounded-lg transition-all min-w-[52px] ${
              isActive ? 'text-primary' : 'text-ink-muted48 hover:text-ink'
            }`
          }
        >
          <CalendarDays className="w-[22px] h-[22px] stroke-[1.5]" />
          <span className="text-[10px] font-semibold">Events</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) =>
            `flex flex-col items-center gap-[3px] px-sm py-xs rounded-lg transition-all min-w-[52px] relative ${
              isActive ? 'text-primary' : 'text-ink-muted48 hover:text-ink'
            }`
          }
        >
          <KanbanSquare className="w-[22px] h-[22px] stroke-[1.5]" />
          <span className="text-[10px] font-semibold">Tasks</span>
        </NavLink>

        {/* Teams — only visible to non-members */}
        {!isMemberOnly && (
          <NavLink
            to="/teams"
            className={({ isActive }) =>
              `flex flex-col items-center gap-[3px] px-sm py-xs rounded-lg transition-all min-w-[52px] ${
                isActive ? 'text-primary' : 'text-ink-muted48 hover:text-ink'
              }`
            }
          >
            <Users className="w-[22px] h-[22px] stroke-[1.5]" />
            <span className="text-[10px] font-semibold">Teams</span>
          </NavLink>
        )}

        {/* More — hamburger shortcut for drawer */}
        <button
          onClick={toggleMobileMenu}
          className={`flex flex-col items-center gap-[3px] px-sm py-xs rounded-lg transition-all min-w-[52px] ${
            mobileMenuOpen ? 'text-primary' : 'text-ink-muted48 hover:text-ink'
          }`}
        >
          <Menu className="w-[22px] h-[22px] stroke-[1.5]" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </nav>

      {/* 6. PWA Install Promotion Banner */}
      <PWAInstallPrompt />
    </div>
  );
};
