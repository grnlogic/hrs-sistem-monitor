"use client";

import * as React from "react";
import Image from "next/image";
import {
  Calendar,
  DollarSign,
  Home,
  LogOut,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  Factory,
  ChevronUp,
  Banknote,
  FileText,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  description: string;
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Ringkasan & Statistik",
  },
  {
    title: "Karyawan",
    url: "/dashboard/employees",
    icon: Users,
    description: "Data & PKB Karyawan",
  },
  {
    title: "Absensi",
    url: "/dashboard/attendance",
    icon: Clock,
    description: "Kehadiran Harian",
  },
  {
    title: "Cuti",
    url: "/dashboard/leave",
    icon: Calendar,
    description: "Pengajuan & Approval",
  },
  {
    title: "Pelanggaran",
    url: "/dashboard/violations",
    icon: AlertTriangle,
    description: "Catatan Pelanggaran",
  },
  {
    title: "Template PKB",
    url: "/dashboard/pkb-template",
    icon: FileText,
    description: "Editor Template PKB",
  },
];

const gajiMenuItems: MenuItem[] = [
  {
    title: "Gaji Staff",
    url: "/dashboard/salary/staff",
    icon: Banknote,
    description: "Proses & Rekap Staff",
  },
  {
    title: "Gaji Non-Staff",
    url: "/dashboard/salary/non-staff",
    icon: DollarSign,
    description: "Proses & Rekap Non-Staff",
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<{
    name: string;
    email: string;
  } | null>(null);

  React.useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser || savedUser === "undefined" || savedUser === "null") return;
    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser && typeof parsedUser === "object") setUser(parsedUser);
    } catch (e) {
      console.error("Error parsing user data", e);
      localStorage.removeItem("user");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const isMenuActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/";
    }

    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <>
      {/* Inject global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        .padud-sidebar {
          font-family: 'Geist', system-ui, sans-serif;
          --sidebar-bg: #0f1117;
          --sidebar-surface: #181b23;
          --sidebar-border: rgba(255,255,255,0.06);
          --sidebar-accent: #3b82f6;
          --sidebar-accent-glow: rgba(59, 130, 246, 0.15);
          --sidebar-text-primary: #f1f5f9;
          --sidebar-text-secondary: #64748b;
          --sidebar-text-muted: #374151;
          background: var(--sidebar-bg) !important;
          border-right: 1px solid var(--sidebar-border) !important;
        }

        .padud-header {
          background: var(--sidebar-bg);
          border-bottom: 1px solid var(--sidebar-border);
          padding: 20px 16px 16px;
        }

        .padud-logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .padud-logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.3), 0 4px 12px rgba(37,99,235,0.3);
        }

        .padud-logo-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .padud-logo-title {
          font-size: 13px;
          font-weight: 700;
          color: #f1f5f9;
          letter-spacing: -0.01em;
          line-height: 1;
        }

        .padud-logo-sub {
          font-size: 9.5px;
          font-weight: 600;
          color: #3b82f6;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          line-height: 1;
        }

        .padud-section-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9.5px;
          font-weight: 600;
          color: var(--sidebar-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0 8px;
          margin-bottom: 6px;
        }

        .padud-section-label svg {
          opacity: 0.5;
        }

        .padud-divider {
          height: 1px;
          background: var(--sidebar-border);
          margin: 16px 8px;
        }

        /* Menu item styles */
        .padud-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          position: relative;
          overflow: hidden;
        }

        .padud-menu-item:not(.active):hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.06);
        }

        .padud-menu-item.active {
          background: var(--sidebar-accent-glow);
          border-color: rgba(59, 130, 246, 0.25);
        }

        .padud-menu-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 2.5px;
          height: 60%;
          background: var(--sidebar-accent);
          border-radius: 0 2px 2px 0;
        }

        .padud-item-icon {
          width: 32px;
          height: 32px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .padud-menu-item:not(.active) .padud-item-icon {
          background: rgba(255,255,255,0.04);
        }

        .padud-menu-item.active .padud-item-icon {
          background: rgba(59, 130, 246, 0.2);
        }

        .padud-item-icon svg {
          transition: color 0.15s ease;
        }

        .padud-menu-item:not(.active) .padud-item-icon svg {
          color: #4b5563;
        }

        .padud-menu-item:not(.active):hover .padud-item-icon svg {
          color: #9ca3af;
        }

        .padud-menu-item.active .padud-item-icon svg {
          color: #60a5fa;
        }

        .padud-item-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .padud-item-title {
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .padud-menu-item:not(.active) .padud-item-title {
          color: #94a3b8;
        }

        .padud-menu-item:not(.active):hover .padud-item-title {
          color: #e2e8f0;
        }

        .padud-menu-item.active .padud-item-title {
          color: #bfdbfe;
        }

        .padud-item-desc {
          font-size: 9.5px;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .padud-menu-item:not(.active) .padud-item-desc {
          color: #374151;
        }

        .padud-menu-item.active .padud-item-desc {
          color: rgba(96, 165, 250, 0.6);
        }

        /* Footer / User area */
        .padud-footer {
          padding: 12px;
          border-top: 1px solid var(--sidebar-border);
          background: var(--sidebar-bg);
        }

        .padud-user-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.06);
          background: var(--sidebar-surface);
          cursor: pointer;
          width: 100%;
          transition: all 0.15s ease;
        }

        .padud-user-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.1);
        }

        .padud-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #1e3a5f, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #93c5fd;
          flex-shrink: 0;
          letter-spacing: 0.05em;
        }

        .padud-user-info {
          flex: 1;
          overflow: hidden;
          text-align: left;
        }

        .padud-user-name {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1;
          margin-bottom: 3px;
        }

        .padud-user-email {
          font-size: 9.5px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1;
        }

        .padud-version-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 10px;
          padding: 5px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
        }

        .padud-version-badge span {
          font-size: 9px;
          font-weight: 500;
          color: #1f2937;
          letter-spacing: 0.05em;
          font-family: 'Geist Mono', monospace;
        }

        /* Dropdown override */
        .padud-dropdown {
          background: #181b23 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          padding: 6px !important;
        }

        .padud-dropdown-header {
          padding: 8px 10px 4px;
        }

        .padud-dropdown-label {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #374151;
        }

        .padud-dropdown-name {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          padding: 4px 10px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 4px;
        }

        .padud-logout-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          color: #f87171;
          transition: all 0.15s ease;
        }

        .padud-logout-item:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        /* Collapsed icon state */
        [data-collapsible=icon] .padud-logo-text,
        [data-collapsible=icon] .padud-item-text,
        [data-collapsible=icon] .padud-user-info,
        [data-collapsible=icon] .padud-section-label span,
        [data-collapsible=icon] .padud-version-badge,
        [data-collapsible=icon] .padud-chevron {
          display: none !important;
        }

        [data-collapsible=icon] .padud-logo-wrap {
          justify-content: center;
        }

        [data-collapsible=icon] .padud-menu-item {
          justify-content: center;
          padding: 9px;
        }

        [data-collapsible=icon] .padud-menu-item.active::before {
          display: none;
        }

        [data-collapsible=icon] .padud-user-btn {
          justify-content: center;
          padding: 9px;
        }
      `}</style>

      <Sidebar
        collapsible="icon"
        className="padud-sidebar border-r-0"
      >
        <SidebarHeader className="padud-header p-0">
          <div className="padud-header">
            <div className="padud-logo-wrap group-data-[collapsible=icon]:justify-center">
              <div className="padud-logo-icon">
                <Image
                  src="/png.png"
                  alt="Logo"
                  width={20}
                  height={20}
                  className="brightness-0 invert object-contain"
                  priority
                />
              </div>
              <div className="padud-logo-text group-data-[collapsible=icon]:hidden">
                <span className="padud-logo-title">PT. PADUD</span>
                <span className="padud-logo-sub">Management System</span>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-3" style={{ background: "#0f1117" }}>
          {/* Menu Utama */}
          <SidebarGroup className="p-0">
            <div className="padud-section-label group-data-[collapsible=icon]:hidden">
              <Shield size={10} />
              <span>Menu Utama</span>
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {menuItems.map((item) => {
                  const isActive = isMenuActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className="h-auto p-0 hover:bg-transparent data-[active=true]:bg-transparent"
                      >
                        <a
                          href={item.url}
                          className={`padud-menu-item ${isActive ? "active" : ""}`}
                        >
                          <div className="padud-item-icon">
                            <item.icon size={15} />
                          </div>
                          <div className="padud-item-text group-data-[collapsible=icon]:hidden">
                            <span className="padud-item-title">{item.title}</span>
                            <span className="padud-item-desc">{item.description}</span>
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="padud-divider" />

          {/* Gaji */}
          <SidebarGroup className="p-0">
            <div className="padud-section-label group-data-[collapsible=icon]:hidden">
              <DollarSign size={10} />
              <span>Penggajian</span>
            </div>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {gajiMenuItems.map((item) => {
                  const isActive = isMenuActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        className="h-auto p-0 hover:bg-transparent data-[active=true]:bg-transparent"
                      >
                        <a
                          href={item.url}
                          className={`padud-menu-item ${isActive ? "active" : ""}`}
                        >
                          <div className="padud-item-icon">
                            <item.icon size={15} />
                          </div>
                          <div className="padud-item-text group-data-[collapsible=icon]:hidden">
                            <span className="padud-item-title">{item.title}</span>
                            <span className="padud-item-desc">{item.description}</span>
                          </div>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="padud-footer p-0">
          <div className="padud-footer">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="padud-user-btn group-data-[collapsible=icon]:justify-center">
                  <div className="padud-user-avatar">
                    {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                  </div>
                  <div className="padud-user-info group-data-[collapsible=icon]:hidden">
                    <div className="padud-user-name">
                      {user?.name || "Administrator"}
                    </div>
                    <div className="padud-user-email">
                      {user?.email || "admin@padud.com"}
                    </div>
                  </div>
                  <ChevronUp
                    size={13}
                    className="padud-chevron ml-auto text-slate-600 group-data-[collapsible=icon]:hidden"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="padud-dropdown w-[--radix-popper-anchor-width] min-w-52 mb-1"
              >
                <div className="padud-dropdown-header">
                  <div className="padud-dropdown-label">Akun Saya</div>
                </div>
                <div className="padud-dropdown-name">
                  {user?.name || "Administrator"}
                </div>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="padud-logout-item focus:bg-red-500/10"
                >
                  <LogOut size={13} />
                  <span>Keluar dari akun</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="padud-version-badge group-data-[collapsible=icon]:hidden">
              <Factory size={9} className="text-gray-700" />
              <span>PT. PADUD · v1.0</span>
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}