import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Wallet,
  Store,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mobile: true },
  { href: "/products", label: "Products", icon: Package, mobile: true },
  { href: "/orders", label: "Orders", icon: ShoppingBag, mobile: true },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: Wallet, mobile: true },
  { href: "/storefront", label: "Storefront", icon: Store },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
