import { useState } from "react";
import { useGetQuotesSummary, useGetProductStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Link } from "wouter";
import { FileText, Package, TrendingUp, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתינה",
  approved: "אושרה",
  cancelled: "בוטלה",
};

const STATUS_VARIANTS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetQuotesSummary();
  const { data: stats, isLoading: isLoadingStats } = useGetProductStats();
  const [search, setSearch] = useState("");

  if (isLoadingSummary || isLoadingStats) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-14 bg-muted/50"></CardHeader>
                <CardContent className="h-20 bg-muted/20"></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const filteredQuotes = (summary?.recentQuotes ?? []).filter((q) =>
    q.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ברוכים הבאים</h1>
          <p className="text-muted-foreground mt-1">סקירה כללית של העסק שלך</p>
        </div>
        <Link href="/quotes/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm">
          <Plus className="ml-2 w-4 h-4" />
          הצעת מחיר חדשה
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">סה״כ הכנסות (הצעות)</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summary?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-accent shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">הצעות מחיר</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(summary?.totalQuotes || 0)}</div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-secondary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">מוצרים בקטלוג</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats?.totalProducts || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4">
        <h2 className="text-xl font-bold">הצעות מחיר אחרונות</h2>
        <div className="relative w-64">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם לקוח..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10 h-9"
            data-testid="input-dashboard-search"
          />
        </div>
      </div>

      {filteredQuotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map(quote => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover:border-primary/50 cursor-pointer transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{quote.customerName}</CardTitle>
                    <span className="text-sm text-muted-foreground">{formatDate(quote.date)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{quote.itemCount} פריטים</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_VARIANTS[quote.status] ?? STATUS_VARIANTS.pending}`}>
                        {STATUS_LABELS[quote.status] ?? quote.status}
                      </span>
                    </div>
                    <div className="text-xl font-semibold text-primary">{formatCurrency(quote.totalAmount)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : search ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">לא נמצאו תוצאות עבור "{search}"</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium">אין הצעות מחיר עדיין</p>
            <p className="text-muted-foreground mb-4">צור את הצעת המחיר הראשונה שלך כדי להתחיל</p>
            <Link href="/quotes/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
              צור הצעה ראשונה
            </Link>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}
