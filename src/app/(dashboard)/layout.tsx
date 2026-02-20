import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
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
        <div className="md:pl-64 bg-[var(--background-subtle)] min-h-screen">
          <Header />
          <main className="px-4 md:px-8 py-4 md:py-6 pb-20 md:pb-6 max-w-7xl mx-auto">
              <AuthGuard>
                <GuestBanner />
                {children}
              </AuthGuard>
          </main>
          <div className="hidden md:block">
            <Footer />
          </div>
          <BottomNav />
        </div>
      </div>
    </AccountProvider>
  );
}
