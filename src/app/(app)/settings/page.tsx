import { LifeBuoy, LogOut } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { getBusinessData, isDemoMode } from "@/lib/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { business: b } = await getBusinessData();
  const locked = isDemoMode();
  const field = (label: string, value: string | number | undefined, type = "text") => (
    <label className="block">
      <span className="text-xs font-medium text-muted">{label}</span>
      <input type={type} defaultValue={value} disabled={locked}
        className="mt-1 h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600 disabled:bg-cream-100 disabled:text-muted" />
    </label>
  );
  return (
    <>
      <PageHeader title="Settings" sub="Business profile, store details and preferences." />
      {locked && <p className="mb-4 rounded-xl bg-cream-200/70 px-3 py-2 text-xs text-muted">Editing is turned on once accounts and the database are connected.</p>}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business profile" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            {field("Business name", b.name)}
            {field("Owner name", b.ownerName)}
            {field("Category", b.category)}
            {field("City", b.city)}
            {field("Phone (WhatsApp)", b.phone, "tel")}
            {field("Email", b.email, "email")}
          </div>
        </Card>
        <Card>
          <CardHeader title="Store & preferences" />
          <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            {field("Store link name", b.slug)}
            {field("Currency", "INR (₹)")}
            {field("Timezone", b.timezone)}
            {field("Low-stock alert at", b.lowStockThreshold, "number")}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Help & support</h2>
          <p className="mt-1 text-sm text-muted">Questions about DukaanPilot? Reach the Ignivox Technologies team.</p>
          {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
            <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-forest-600 hover:underline"><LifeBuoy className="size-4" /> Contact support</a>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted">Sign out of DukaanPilot on this device.</p>
          <button disabled={locked} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-danger disabled:opacity-50"><LogOut className="size-4" /> Sign out</button>
        </Card>
      </div>
    </>
  );
}
