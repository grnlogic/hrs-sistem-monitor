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
  Settings,
  ImageIcon,
  Archive,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu";
import { removeAuthToken } from "@/lib/api";
import { UserRole } from "@/lib/auth/roles";
import { NAMA_PT } from "@/lib/constants/perusahaan";

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
    title: "Galeri",
    url: "/dashboard/galeri",
    icon: ImageIcon,
    description: "Dokumentasi Foto & Video",
  },
  {
    title: "Arsip",
    url: "/dashboard/arsip",
    icon: Archive,
    description: "Dokumen PDF, Word, Excel",
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

const settingsMenuItems: MenuItem[] = [
  {
    title: "Manajemen User",
    url: "/dashboard/settings/users",
    icon: Settings,
    description: "Kelola akun HRD & Akuntansi",
  },
];

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const user = React.useMemo(
    () => ({
      name: session?.user?.name || "Administrator",
      email: session?.user?.email || "admin@padud.com",
      role: (session?.user?.role || "HRD") as UserRole,
    }),
    [session]
  );

  const isAccounting = user.role === "AKUNTANSI";

  const handleLogout = async () => {
    removeAuthToken();
    await signOut({ redirect: false });
    router.replace("/");
    router.refresh();
  };

  const isMenuActive = (url: string) => {
    if (url === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/";
    }

    return pathname === url || pathname.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon" className="bg-sidebar-bg border-r border-sidebar-border">
      {/* Header */}
      <SidebarHeader className="bg-sidebar-bg border-b border-sidebar-border p-4 pb-3">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-surface shadow-sm">
            <Image
              src="/png.png"
              alt="Logo"
              width={20}
              height={20}
              className="brightness-0 invert object-contain"
              priority
            />
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-[13px] font-bold leading-tight text-sidebar-text tracking-tight">
              {NAMA_PT.PJP}
            </span>
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] leading-tight text-sidebar-text-muted">
              Management System
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="px-2 py-3">
        {!isAccounting && (
          <>
            {/* Menu Utama */}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-text-muted px-2 mb-1 group-data-[collapsible=icon]:hidden">
                <Shield size={10} className="opacity-50" />
                Menu Utama
              </SidebarGroupLabel>
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
                            onClick={() => { if (isMobile) setOpenMobile(false); }}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150
                              ${isActive
                                ? "bg-sidebar-surface text-sidebar-text border border-sidebar-border border-l-2 border-l-sidebar-active"
                                : "text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-surface/50 border border-transparent"
                              }`}
                          >
                            {/* Icon: always rendered for collapsed state, hidden text pushes it */}
                            {isActive ? (
                              <item.icon size={15} className="shrink-0 text-sidebar-text" />
                            ) : (
                              <item.icon size={15} className="shrink-0 text-sidebar-text-muted group-data-[collapsible=icon]:block hidden" />
                            )}
                            <span className="text-[13px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis group-data-[collapsible=icon]:hidden">
                              {item.title}
                            </span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="my-3 mx-2 border-t border-sidebar-border" />
          </>
        )}

        {/* Gaji */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-text-muted px-2 mb-1 group-data-[collapsible=icon]:hidden">
            <DollarSign size={10} className="opacity-50" />
            Penggajian
          </SidebarGroupLabel>
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
                        onClick={() => { if (isMobile) setOpenMobile(false); }}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150
                          ${isActive
                            ? "bg-sidebar-surface text-sidebar-text border border-sidebar-border border-l-2 border-l-sidebar-active"
                            : "text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-surface/50 border border-transparent"
                          }`}
                      >
                        {isActive ? (
                          <item.icon size={15} className="shrink-0 text-sidebar-text" />
                        ) : (
                          <item.icon size={15} className="shrink-0 text-sidebar-text-muted group-data-[collapsible=icon]:block hidden" />
                        )}
                        <span className="text-[13px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isAccounting && (
          <>
            <div className="my-3 mx-2 border-t border-sidebar-border" />
            {/* Pengaturan */}
            <SidebarGroup className="p-0">
              <SidebarGroupLabel className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-sidebar-text-muted px-2 mb-1 group-data-[collapsible=icon]:hidden">
                <Settings size={10} className="opacity-50" />
                Pengaturan
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {settingsMenuItems.map((item) => {
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
                            onClick={() => { if (isMobile) setOpenMobile(false); }}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150
                              ${isActive
                                ? "bg-sidebar-surface text-sidebar-text border border-sidebar-border border-l-2 border-l-sidebar-active"
                                : "text-sidebar-text-muted hover:text-sidebar-text hover:bg-sidebar-surface/50 border border-transparent"
                              }`}
                          >
                            {isActive ? (
                              <item.icon size={15} className="shrink-0 text-sidebar-text" />
                            ) : (
                              <item.icon size={15} className="shrink-0 text-sidebar-text-muted group-data-[collapsible=icon]:block hidden" />
                            )}
                            <span className="text-[13px] font-medium leading-tight whitespace-nowrap overflow-hidden text-ellipsis group-data-[collapsible=icon]:hidden">
                              {item.title}
                            </span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="bg-sidebar-bg border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-xl bg-sidebar-surface border border-sidebar-border hover:bg-sidebar-surface/80 transition-all duration-150 cursor-pointer group-data-[collapsible=icon]:justify-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-surface text-[11px] font-bold text-sidebar-text-muted tracking-wider border border-sidebar-border">
                {user?.name?.slice(0, 2).toUpperCase() || "AD"}
              </div>
              <div className="flex-1 overflow-hidden text-left group-data-[collapsible=icon]:hidden">
                <div className="text-xs font-semibold text-sidebar-text leading-none mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.name || "Administrator"}
                </div>
                <div className="text-[10px] text-sidebar-text-muted leading-none whitespace-nowrap overflow-hidden text-ellipsis">
                  {user?.email || "admin@padud.com"}
                </div>
              </div>
              <ChevronUp
                size={13}
                className="ml-auto text-sidebar-text-muted group-data-[collapsible=icon]:hidden"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="bg-sidebar-surface border border-sidebar-border shadow-xl w-[--radix-popper-anchor-width] min-w-52 mb-1 rounded-xl p-1.5"
          >
            <div className="px-2.5 pt-2 pb-1">
              <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-sidebar-text-muted">
                Akun Saya
              </div>
            </div>
            <div className="px-2.5 py-2 text-xs font-semibold text-sidebar-text border-b border-sidebar-border mb-1">
              {user?.name || "Administrator"}
            </div>
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] font-medium text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
            >
              <LogOut size={13} />
              <span>Keluar dari akun</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center justify-center gap-1.5 mt-2.5 px-2 py-1.5 rounded-md bg-sidebar-surface/30 border border-sidebar-border/50 group-data-[collapsible=icon]:hidden">
          <Factory size={9} className="text-sidebar-text-muted" />
          <span className="text-[9px] font-medium text-sidebar-text-muted tracking-wider">
            {NAMA_PT.PJP} · v1.0
          </span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
