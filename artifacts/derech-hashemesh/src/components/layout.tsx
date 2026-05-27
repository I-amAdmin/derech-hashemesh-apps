import { Link, useLocation } from "wouter";
import { LayoutDashboard, Package, FileText, Users } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "ראשי", icon: LayoutDashboard },
    { href: "/quotes", label: "הצעות מחיר", icon: FileText },
    { href: "/customers", label: "לקוחות", icon: Users },
    { href: "/products", label: "מוצרים", icon: Package },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      <nav className="md:w-64 border-b md:border-b-0 md:border-l border-border bg-card p-4 flex flex-col gap-4">
        <div className="mb-2 flex flex-col items-start gap-2">
          <img
            src="/logo.png"
            alt="דרך השמש"
            className="h-16 w-auto object-contain"
          />
          <p className="text-xs text-muted-foreground">מערכת הצעות מחיר</p>
        </div>

        <div className="flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
