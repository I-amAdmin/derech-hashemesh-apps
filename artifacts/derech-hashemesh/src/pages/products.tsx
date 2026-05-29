import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useListQuotes,
  useUpdateQuote,
  getListProductsQueryKey,
  getGetProductStatsQueryKey,
  getListQuotesQueryKey,
  getGetQuoteQueryKey,
  getQuote,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Pencil, Trash2, Search, Package, ChevronDown, ChevronUp, ShoppingCart, X, FileText, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const productSchema = z.object({
  barcode: z.string().min(1, "שדה חובה"),
  description: z.string().min(1, "שדה חובה"),
  weightKg: z.coerce.number().min(0.001, "משקל חייב להיות חיובי"),
  pricePerKg: z.coerce.number().min(0, "מחיר חייב להיות חיובי"),
  department: z.string().min(1, "שדה חובה"),
  notes: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function Products() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: products, isLoading } = useListProducts();
  const { data: quotes } = useListQuotes();
  const [search, setSearch] = useState("");
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>({});

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isAddToQuoteOpen, setIsAddToQuoteOpen] = useState(false);
  const [addingToQuoteId, setAddingToQuoteId] = useState<number | null>(null);

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateQuote = useUpdateQuote();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      barcode: "",
      description: "",
      weightKg: 0,
      pricePerKg: 0,
      department: "כללי",
      notes: "",
    },
  });

  const filteredProducts = useMemo(() =>
    (products ?? []).filter(
      (p) =>
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search) ||
        p.department.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);

  const groupedByDept = useMemo(() => {
    const groups: Record<string, typeof filteredProducts> = {};
    for (const p of filteredProducts) {
      const dept = p.department || "כללי";
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, "he"));
  }, [filteredProducts]);

  const toggleDept = (dept: string) => {
    setOpenDepts((prev) => ({ ...prev, [dept]: !prev[dept] }));
  };

  const isDeptOpen = (dept: string) => {
    if (dept in openDepts) return openDepts[dept];
    return search.length > 0 || true;
  };

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getDeptSelectionState = (deptProducts: typeof filteredProducts): "none" | "some" | "all" => {
    const ids = deptProducts.map((p) => p.id);
    const selected = ids.filter((id) => selectedIds.has(id));
    if (selected.length === 0) return "none";
    if (selected.length === ids.length) return "all";
    return "some";
  };

  const toggleDeptSelection = (deptProducts: typeof filteredProducts) => {
    const state = getDeptSelectionState(deptProducts);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (state === "all") {
        deptProducts.forEach((p) => next.delete(p.id));
      } else {
        deptProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const pendingQuotes = useMemo(
    () => (quotes ?? []).filter((q) => q.status === "pending"),
    [quotes]
  );

  const handleAddToExistingQuote = async (quoteId: number) => {
    setAddingToQuoteId(quoteId);
    try {
      const existingQuote = await queryClient.fetchQuery({
        queryKey: getGetQuoteQueryKey(quoteId),
        queryFn: () => getQuote(quoteId),
      });

      const existingProductIds = new Set(existingQuote.items.map((i) => i.productId));
      const existingItems = existingQuote.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        customPricePerKg: i.pricePerKg,
      }));

      const newItems = Array.from(selectedIds)
        .filter((id) => !existingProductIds.has(id))
        .map((id) => ({ productId: id, quantity: 1, customPricePerKg: 0 }));

      if (newItems.length === 0) {
        toast({ title: "כל המוצרים כבר קיימים בהצעה זו" });
        setAddingToQuoteId(null);
        return;
      }

      await updateQuote.mutateAsync({
        id: quoteId,
        data: {
          customerName: existingQuote.customerName,
          contactName: existingQuote.contactName ?? undefined,
          customerPhone: existingQuote.customerPhone ?? undefined,
          email: existingQuote.email ?? undefined,
          date: existingQuote.date,
          notes: existingQuote.notes ?? undefined,
          items: [...existingItems, ...newItems],
        },
      });

      queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetQuoteQueryKey(quoteId) });

      setIsAddToQuoteOpen(false);
      clearSelection();
      toast({ title: `${newItems.length} מוצרים נוספו להצעה #${quoteId}` });
    } catch {
      toast({ title: "שגיאה בהוספת מוצרים", variant: "destructive" });
    } finally {
      setAddingToQuoteId(null);
    }
  };

  const handleAddToNewQuote = () => {
    sessionStorage.setItem(
      "preselected_products",
      JSON.stringify(Array.from(selectedIds))
    );
    setIsAddToQuoteOpen(false);
    clearSelection();
    setLocation("/quotes/new");
  };

  const handleOpenAdd = () => {
    form.reset({ barcode: "", description: "", weightKg: 0, pricePerKg: 0, department: "כללי", notes: "" });
    setEditingProduct(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    form.reset({
      barcode: product.barcode,
      description: product.description,
      weightKg: product.weightKg,
      pricePerKg: product.pricePerKg,
      department: product.department || "כללי",
      notes: product.notes || "",
    });
    setEditingProduct(product);
    setIsAddOpen(true);
  };

  const onSubmit = (data: ProductFormValues) => {
    if (editingProduct) {
      updateProduct.mutate(
        { id: editingProduct.id, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetProductStatsQueryKey() });
            setIsAddOpen(false);
            toast({ title: "המוצר עודכן בהצלחה" });
          },
          onError: () => toast({ title: "שגיאה בעדכון המוצר", variant: "destructive" })
        }
      );
    } else {
      createProduct.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetProductStatsQueryKey() });
            setIsAddOpen(false);
            toast({ title: "המוצר נוצר בהצלחה" });
          },
          onError: () => toast({ title: "שגיאה ביצירת המוצר", variant: "destructive" })
        }
      );
    }
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteProduct.mutate(
        { id: deletingId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetProductStatsQueryKey() });
            setDeletingId(null);
            toast({ title: "המוצר נמחק בהצלחה" });
          },
          onError: () => {
            setDeletingId(null);
            toast({ title: "שגיאה במחיקת המוצר", variant: "destructive" });
          }
        }
      );
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול מוצרים</h1>
          <p className="text-muted-foreground mt-1">
            {products ? `${products.length} מוצרים ב-${groupedByDept.length} מחלקות` : "טוען..."}
          </p>
        </div>
        <Button onClick={handleOpenAdd} data-testid="button-add-product" className="shadow-sm">
          <Plus className="ml-2 w-4 h-4" />
          הוסף מוצר
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי תיאור, ברקוד או מחלקה..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
              data-testid="input-search-products"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">טוען נתונים...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
          <Package className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">לא נמצאו מוצרים</p>
          <p className="text-sm">נסה לשנות את מילות החיפוש</p>
        </div>
      ) : (
        <div className="space-y-3 pb-28">
          {groupedByDept.map(([dept, deptProducts]) => {
            const deptState = getDeptSelectionState(deptProducts);
            return (
              <Collapsible
                key={dept}
                open={isDeptOpen(dept)}
                onOpenChange={() => toggleDept(dept)}
              >
                <div className="w-full flex items-center bg-card border rounded-lg hover:bg-muted/50 transition-colors overflow-hidden">
                  <div
                    className="flex items-center px-4 py-3 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleDeptSelection(deptProducts); }}
                    title={`בחר את כל ${dept}`}
                  >
                    <input
                      type="checkbox"
                      checked={deptState === "all"}
                      ref={(el) => { if (el) el.indeterminate = deptState === "some"; }}
                      onChange={() => toggleDeptSelection(deptProducts)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-[#8B7040] cursor-pointer"
                      aria-label={`בחר את כל ${dept}`}
                    />
                  </div>
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex-1 flex items-center justify-between px-2 py-3"
                      data-testid={`button-dept-${dept}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base">{dept}</span>
                        <Badge variant="secondary" className="text-xs">
                          {deptProducts.length} מוצרים
                        </Badge>
                        {deptState !== "none" && (
                          <Badge variant="outline" className="text-xs text-primary border-primary/40 bg-primary/5">
                            {deptState === "all" ? "הכל נבחר" : `${deptProducts.filter(p => selectedIds.has(p.id)).length} נבחרו`}
                          </Badge>
                        )}
                      </div>
                      {isDeptOpen(dept)
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-4" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground ml-4" />
                      }
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <div className="border border-t-0 rounded-b-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="w-[48px] text-right pr-4"></TableHead>
                          <TableHead className="text-right w-[140px]">ברקוד</TableHead>
                          <TableHead className="text-right">תיאור פריט</TableHead>
                          <TableHead className="text-right w-[120px]">סה"כ משקל (ק"ג)</TableHead>
                          <TableHead className="text-right w-[130px]">מחיר לק"ג</TableHead>
                          <TableHead className="text-right w-[130px]">מחיר ליחידה</TableHead>
                          <TableHead className="w-[90px] text-left">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptProducts.map((product) => (
                          <TableRow
                            key={product.id}
                            data-testid={`row-product-${product.id}`}
                            className={selectedIds.has(product.id) ? "bg-primary/5" : ""}
                          >
                            <TableCell className="pr-4">
                              <Checkbox
                                checked={selectedIds.has(product.id)}
                                onCheckedChange={() => toggleProduct(product.id)}
                                aria-label={`בחר ${product.description}`}
                                data-testid={`checkbox-product-${product.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs">{product.barcode}</TableCell>
                            <TableCell className="font-medium">{product.description}</TableCell>
                            <TableCell>{formatNumber(product.weightKg)} ק"ג</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {formatCurrency(product.pricePerKg)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatCurrency(product.pricePerKg * product.weightKg)}
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenEdit(product)}
                                  data-testid={`button-edit-product-${product.id}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingId(product.id)}
                                  data-testid={`button-delete-product-${product.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 right-0 left-0 z-50 flex justify-center pointer-events-none">
          <div
            className="mb-6 mx-4 w-full max-w-2xl bg-[#8B7040] text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center justify-between gap-4 pointer-events-auto"
            style={{ boxShadow: "0 8px 32px rgba(139,112,64,0.35)" }}
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full w-9 h-9 flex items-center justify-center font-bold text-lg">
                {selectedIds.size}
              </div>
              <span className="font-semibold text-base">
                {selectedIds.size === 1 ? "מוצר נבחר" : "מוצרים נבחרו"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 h-9 px-3"
                onClick={clearSelection}
              >
                <X className="w-4 h-4 ml-1" />
                נקה
              </Button>
              <Button
                size="sm"
                className="bg-white text-[#8B7040] hover:bg-white/90 font-bold h-9 px-4 shadow-sm"
                onClick={() => setIsAddToQuoteOpen(true)}
                data-testid="button-add-to-quote"
              >
                <ShoppingCart className="w-4 h-4 ml-2" />
                הוסף להצעה
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isAddToQuoteOpen} onOpenChange={setIsAddToQuoteOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              הוסף {selectedIds.size} מוצרים להצעה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <button
              onClick={handleAddToNewQuote}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors text-right"
              data-testid="button-add-to-new-quote"
            >
              <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <PlusCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">הצעת מחיר חדשה</p>
                <p className="text-xs text-muted-foreground">צור הצעה חדשה עם המוצרים הנבחרים</p>
              </div>
            </button>

            {pendingQuotes.length > 0 && (
              <>
                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground">או הוסף להצעה קיימת</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pendingQuotes.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleAddToExistingQuote(q.id)}
                      disabled={addingToQuoteId === q.id}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors text-right disabled:opacity-60"
                      data-testid={`button-add-to-quote-${q.id}`}
                    >
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">#{q.id} — {q.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(q.date), "dd/MM/yyyy")} · {q.itemCount} פריטים
                        </p>
                      </div>
                      {addingToQuoteId === q.id && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {pendingQuotes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                אין הצעות ממתינות — תיצור הצעה חדשה
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsAddToQuoteOpen(false)}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ברקוד</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" className="text-left" data-testid="input-barcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחלקה</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="שם מחלקה" data-testid="input-department" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תיאור מוצר</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>משקל תכולה (ק"ג)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" {...field} data-testid="input-weight" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחיר לק"ג (₪)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-price-per-kg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות (אופציונלי)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4 sm:justify-start">
                <Button
                  type="submit"
                  disabled={createProduct.isPending || updateProduct.isPending}
                  data-testid="button-submit-product"
                >
                  {editingProduct ? "שמור שינויים" : "צור מוצר"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את המוצר לצמיתות. לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:justify-start gap-2">
            <AlertDialogCancel className="mt-0">ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProduct.isPending}
              data-testid="button-confirm-delete"
            >
              מחק מוצר
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
