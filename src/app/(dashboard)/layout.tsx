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
          <main className="px-0 md:px-5 py-2 md:py-4 pb-20 md:pb-6 max-w-7xl mx-auto">
              <AuthGuard>
                <GuestBanner />
                {children}
              </AuthGuard>
          </main>
          <BottomNav />
        </div>
      </div>
    </AccountProvider>
  );
}
