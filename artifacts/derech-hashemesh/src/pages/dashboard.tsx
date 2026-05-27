import { useGetQuotesSummary, useGetProductStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { Link } from "wouter";
import { FileText, Package, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetQuotesSummary();
  const { data: stats, isLoading: isLoadingStats } = useGetProductStats();

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

      <h2 className="text-xl font-bold mb-4">הצעות מחיר אחרונות</h2>
      
      {summary?.recentQuotes && summary.recentQuotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.recentQuotes.map(quote => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover:border-primary/50 cursor-pointer transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{quote.customerName}</CardTitle>
                    <span className="text-sm text-muted-foreground">{formatDate(quote.date)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-sm text-muted-foreground">{quote.itemCount} פריטים</div>
                    <div className="text-xl font-semibold text-primary">{formatCurrency(quote.totalAmount)}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
