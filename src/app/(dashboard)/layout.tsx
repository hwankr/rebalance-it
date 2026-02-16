import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GuestBanner } from "@/components/guest/guest-banner";
import { AuthGuard } from "@/components/guest/auth-guard";
import { AccountProvider } from "@/contexts/account-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccountProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="md:pl-64">
          <Header />
          <main className="relative p-4 md:p-6 pb-24 md:pb-6">
            {/* Decorative mesh gradient + dot grid background */}
            <div className="fixed inset-0 md:left-64 top-14 bg-mesh pointer-events-none -z-10" />
            <div className="fixed inset-0 md:left-64 top-14 bg-dot-grid opacity-30 pointer-events-none -z-10" />
            <div className="relative z-10">
              <AuthGuard>
                <GuestBanner />
                {children}
              </AuthGuard>
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    </AccountProvider>
  );
}
