import { AppFrame } from "@/components/app-frame";
import { getBusinessData, isDemoMode } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const data = await getBusinessData();
  const pending = data.orders.filter((o) => o.status === "pending").length;
  return (
    <AppFrame
      business={{ name: data.business.name, category: data.business.category, ownerName: data.business.ownerName }}
      pendingOrders={pending}
      demo={isDemoMode()}
    >
      {children}
    </AppFrame>
  );
}
