"use client";

import {
  Calendar,
  DollarSign,
  Home,
  LogOut,
  Settings,
  Shield,
  Users,
  Clock,
  AlertTriangle,
  Factory,
  Zap,
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

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Overview",
  },
  {
    title: "Karyawan",
    url: "/dashboard/employees",
    icon: Users,
    description: "Manajemen SDM",
  },
  {
    title: "Absensi",
    url: "/dashboard/attendance",
    icon: Clock,
    description: "Kehadiran",
  },
  {
    title: "Gaji",
    url: "/dashboard/salary",
    icon: DollarSign,
    description: "Payroll",
  },
  {
    title: "Cuti",
    url: "/dashboard/leave",
    icon: Calendar,
    description: "Leave Request",
  },
  {
    title: "Pelanggaran",
    url: "/dashboard/violations",
    icon: AlertTriangle,
    description: "Violations",
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    router.push("/");
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100"
    >
      <SidebarHeader className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Factory className="h-5 w-5 text-white" />
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-orange-500 rounded-full flex items-center justify-center">
              <Zap className="h-2 w-2 text-white" />
            </div>
          </div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate font-bold text-white text-lg">
              PT. PADUD
            </span>
            <span className="truncate text-xs text-blue-100 font-medium">
              Monitoring System
            </span>
          </div>
        </div>

        {/* Status indicator */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-blue-100">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>System Online</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 font-semibold text-xs uppercase tracking-wider px-3 py-2 flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1">
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title} className="mb-6">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`
                        mx-2 rounded-lg transition-all duration-200 group relative overflow-hidden
                        ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105"
                            : "hover:bg-slate-200 hover:scale-102 text-slate-700 hover:text-slate-900"
                        }
                      `}
                    >
                      <a
                        href={item.url}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <div
                          className={`
                          flex h-8 w-8 items-center justify-center rounded-lg transition-colors
                          ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-300 group-hover:text-slate-800"
                          }
                        `}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">
                            {item.title}
                          </span>
                          <span
                            className={`text-xs truncate ${
                              isActive ? "text-blue-100" : "text-slate-500"
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                        {isActive && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white rounded-l-full"></div>
                        )}
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 bg-slate-50 p-2">
        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Pengaturan Profil"
              className="mx-2 rounded-lg hover:bg-slate-200 transition-all duration-200 text-slate-700 hover:text-slate-900"
            >
              <a
                href="/dashboard/profile"
                className="flex items-center gap-3 px-3 py-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="font-medium">Profil</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Keluar Sistem"
              className="mx-2 rounded-lg hover:bg-red-50 transition-all duration-200 text-slate-700 hover:text-red-600 group"
            >
              <div className="flex items-center gap-3 px-3 py-2 w-full">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="font-medium">Logout</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Footer info */}
        <div className="mt-2 px-4 py-2 text-center">
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Factory className="h-3 w-3" />
              <span>Industrial EMS</span>
            </div>
            <div className="text-slate-400">v2.1.0</div>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail className="bg-slate-200" />
    </Sidebar>
  );
}
