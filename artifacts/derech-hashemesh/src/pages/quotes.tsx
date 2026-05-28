import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListQuotes,
  useDeleteQuote,
  useUpdateQuoteStatus,
  getListQuotesQueryKey,
  getGetQuotesSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Eye, Trash2, FileText, ChevronDown, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, string> = {
  pending: "ממתינה",
  approved: "אושרה",
  cancelled: "בוטלה",
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function Quotes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: quotes, isLoading } = useListQuotes();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();

  const filteredQuotes = quotes?.filter(
    (q) =>
      q.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (q.customerPhone && q.customerPhone.includes(search))
  ) || [];

  const handleDelete = () => {
    if (deletingId) {
      deleteQuote.mutate(
        { id: deletingId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetQuotesSummaryQueryKey() });
            setDeletingId(null);
            toast({ title: "הצעת המחיר נמחקה בהצלחה" });
          },
          onError: () => {
            setDeletingId(null);
            toast({ title: "שגיאה במחיקת הצעת המחיר", variant: "destructive" });
          }
        }
      );
    }
  };

  const handleStatusChange = (id: number, status: "pending" | "approved" | "cancelled") => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetQuotesSummaryQueryKey() });
          toast({ title: `סטטוס עודכן: ${STATUS_LABELS[status]}` });
        },
        onError: () => toast({ title: "שגיאה בעדכון סטטוס", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">הצעות מחיר</h1>
          <p className="text-muted-foreground mt-1">רשימת הצעות המחיר של העסק</p>
        </div>
        <Link href="/quotes/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm">
          <Plus className="ml-2 w-4 h-4" />
          הצעת מחיר חדשה
        </Link>
      </div>

      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם לקוח או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">טוען נתונים...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">לא נמצאו הצעות מחיר</p>
            <p className="text-sm mb-4">נסה לשנות את מילות החיפוש או צור הצעה חדשה</p>
            <Link href="/quotes/new" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
              צור הצעה חדשה
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px] text-right">מזהה</TableHead>
                <TableHead className="text-right">שם לקוח</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">פריטים</TableHead>
                <TableHead className="text-right">סה״כ</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="w-[130px] text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">#{quote.id}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {quote.customerName}
                      {quote.viewedAt && (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium shrink-0"
                          title={`נצפה ב-${new Date(quote.viewedAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}`}
                          data-testid={`badge-viewed-${quote.id}`}
                        >
                          <Eye className="w-3 h-3" />
                          נצפה
                        </span>
                      )}
                    </div>
                    {quote.customerPhone && <div className="text-xs text-muted-foreground mt-0.5">{quote.customerPhone}</div>}
                  </TableCell>
                  <TableCell>{formatDate(quote.date)}</TableCell>
                  <TableCell>{quote.itemCount}</TableCell>
                  <TableCell className="font-bold text-primary">{formatCurrency(quote.totalAmount)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_CLASSES[quote.status] ?? STATUS_CLASSES.pending}`}
                          data-testid={`badge-status-${quote.id}`}
                        >
                          {STATUS_LABELS[quote.status] ?? quote.status}
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {(["pending", "approved", "cancelled"] as const).map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onSelect={() => handleStatusChange(quote.id, s)}
                            className={quote.status === s ? "font-bold" : ""}
                            data-testid={`menu-status-${quote.id}-${s}`}
                          >
                            {STATUS_LABELS[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex justify-end gap-1">
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="ghost" size="icon" title="צפה" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/quotes/${quote.id}/edit`}>
                        <Button variant="ghost" size="icon" title="ערוך" className="h-8 w-8">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => setDeletingId(quote.id)} title="מחק">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הצעת המחיר לצמיתות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteQuote.isPending}>
              מחק הצעה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
