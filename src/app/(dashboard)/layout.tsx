import { TopNavbar } from "@/components/layout/top-navbar";
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
      <div className="min-h-screen overflow-x-hidden bg-[var(--background-subtle)] flex flex-col">
        <TopNavbar />
        <main className="w-full px-4 md:px-8 py-4 md:py-6 pb-20 md:pb-6 max-w-[1400px] mx-auto flex-1">
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
    </AccountProvider>
  );
}
