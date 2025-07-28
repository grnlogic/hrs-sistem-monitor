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
  ChevronRight,
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

// Tipe data untuk menu items
type MenuItem = {
  title: string;
  url: string;
  icon: any;
  description: string;
  submenu?: {
    title: string;
    url: string;
    description: string;
  }[];
};

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    description: "Overview & Analytics",
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
    description: "Kehadiran & Waktu",
  },
  {
    title: "Gaji",
    url: "/dashboard/salary",
    icon: DollarSign,
    description: "Payroll & Benefit",
    submenu: [
      {
        title: "Rekap Gaji",
        url: "/dashboard/salary",
        description: "Lihat semua gaji",
      },
      {
        title: "Proses Gaji",
        url: "/dashboard/salary/process",
        description: "Generate gaji STAFF & non-STAFF",
      },
      {
        title: "Tambah Bonus",
        url: "/dashboard/salary/bonus",
        description: "Kelola bonus karyawan",
      },
      {
        title: "Kelola Potongan",
        url: "/dashboard/salary/potongan",
        description: "Kelola potongan gaji",
      },
      {
        title: "Update Gaji STAFF",
        url: "/dashboard/salary/update-staff",
        description: "Update gaji per bulan STAFF",
      },
    ],
  },
  {
    title: "Cuti",
    url: "/dashboard/leave",
    icon: Calendar,
    description: "Leave Management",
  },
  {
    title: "Pelanggaran",
    url: "/dashboard/violations",
    icon: AlertTriangle,
    description: "Violations & Report",
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
      className="border-r border-slate-200/60 bg-white shadow-sm"
    >
      {/* Header */}
      <SidebarHeader className="border-b border-slate-200/60 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        ></div>

        <div className="relative flex items-center gap-4 px-6 py-6">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm shadow-lg border border-white/20">
            <Factory className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-sm">
              <Zap className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-xl tracking-tight">
              PT. PADUD
            </h1>
            <p className="text-blue-100/80 text-sm font-medium mt-0.5">
              Employee Management System
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="relative px-6 pb-4">
          <div className="flex items-center gap-3 text-sm text-blue-100/90 bg-white/10 rounded-lg px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-sm"></div>
              <span className="font-medium">System Online</span>
            </div>
            <div className="ml-auto text-xs text-blue-200/70">v1.0.0</div>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="px-3 py-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-500 font-semibold text-xs uppercase tracking-wider px-4 py-3 flex items-center gap-2 mb-2">
            <Shield className="h-3.5 w-3.5" />
            Menu Utama
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.url ||
                  (item.submenu &&
                    item.submenu.some((sub) => pathname === sub.url));
                const hasSubmenu = item.submenu && item.submenu.length > 0;

                return (
                  <div key={item.title}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`
                          mx-1 rounded-xl transition-all duration-300 group relative overflow-hidden min-h-[60px]
                          ${
                            isActive
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 scale-[1.02] border border-blue-400/30"
                              : "hover:bg-slate-50 hover:scale-[1.01] text-slate-700 hover:text-slate-900 border border-transparent hover:border-slate-200/60"
                          }
                        `}
                      >
                        <a
                          href={item.url}
                          className="flex items-center gap-4 px-4 py-3 w-full"
                        >
                          <div
                            className={`
                              flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 shrink-0
                              ${
                                isActive
                                  ? "bg-white/20 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:text-slate-800 group-hover:scale-110"
                              }
                            `}
                          >
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-sm truncate leading-tight">
                              {item.title}
                            </span>
                            <span
                              className={`text-xs truncate mt-0.5 leading-tight ${
                                isActive
                                  ? "text-blue-100"
                                  : "text-slate-500 group-hover:text-slate-600"
                              }`}
                            >
                              {item.description}
                            </span>
                          </div>
                          {hasSubmenu && (
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isActive
                                  ? "text-white rotate-90"
                                  : "text-slate-400 opacity-0 group-hover:opacity-100"
                              }`}
                            />
                          )}
                          {isActive && !hasSubmenu && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-sm"></div>
                          )}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Submenu */}
                    {hasSubmenu && isActive && (
                      <div className="ml-4 mt-2 space-y-1">
                        {item.submenu!.map((subItem) => {
                          const isSubActive = pathname === subItem.url;
                          return (
                            <SidebarMenuItem key={subItem.title}>
                              <SidebarMenuButton
                                asChild
                                isActive={isSubActive}
                                tooltip={subItem.title}
                                className={`
                                  mx-1 rounded-lg transition-all duration-300 group relative overflow-hidden min-h-[50px]
                                  ${
                                    isSubActive
                                      ? "bg-blue-100 text-blue-700 shadow-sm border border-blue-200"
                                      : "hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-transparent hover:border-slate-200"
                                  }
                                `}
                              >
                                <a
                                  href={subItem.url}
                                  className="flex items-center gap-3 px-3 py-2 w-full"
                                >
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="font-medium text-sm truncate leading-tight">
                                      {subItem.title}
                                    </span>
                                    <span
                                      className={`text-xs truncate mt-0.5 leading-tight ${
                                        isSubActive
                                          ? "text-blue-600"
                                          : "text-slate-500 group-hover:text-slate-600"
                                      }`}
                                    >
                                      {subItem.description}
                                    </span>
                                  </div>
                                  {isSubActive && (
                                    <div className="w-1 h-6 bg-blue-500 rounded-l-full"></div>
                                  )}
                                </a>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-slate-200/60 bg-slate-50/50 p-3">
        <SidebarMenu className="space-y-2">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Pengaturan Profil"
              className="mx-1 rounded-xl hover:bg-slate-100 transition-all duration-300 text-slate-700 hover:text-slate-900 min-h-[50px] group"
            >
              <a
                href="/dashboard/profile"
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-200 group-hover:scale-110 transition-all duration-300">
                  <Settings className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">Pengaturan</span>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Keluar Sistem"
              className="mx-1 rounded-xl hover:bg-red-50 transition-all duration-300 text-slate-700 hover:text-red-600 group min-h-[50px] border border-transparent hover:border-red-200/60"
            >
              <div className="flex items-center gap-3 px-4 py-3 w-full">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600 group-hover:scale-110 transition-all duration-300">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm">Logout</span>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-red-400 transition-all duration-200 ml-auto" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Footer info */}
        <div className="mt-4 px-4 py-3 text-center bg-white rounded-xl border border-slate-200/60">
          <div className="flex items-center justify-center gap-2 text-slate-600 mb-1">
            <Factory className="h-4 w-4" />
            <span className="font-semibold text-sm">Industrial EMS</span>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            Powered by PT. PADUD
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail className="bg-slate-200/80" />
    </Sidebar>
  );
}
