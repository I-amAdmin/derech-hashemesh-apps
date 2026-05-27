import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useListProducts, useCreateQuote, getListQuotesQueryKey, getGetQuotesSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Trash2, Plus, ArrowRight, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const quoteItemSchema = z.object({
  productId: z.number(),
  quantity: z.coerce.number().min(1, "כמות חייבת להיות לפחות 1"),
});

const quoteSchema = z.object({
  customerName: z.string().min(1, "שדה חובה"),
  customerPhone: z.string().optional(),
  date: z.string().min(1, "שדה חובה"),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "יש להוסיף לפחות פריט אחד"),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function QuoteNew() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: products, isLoading: isLoadingProducts } = useListProducts();
  const createQuote = useCreateQuote();

  const [productSearch, setProductSearch] = useState("");
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");

  const filteredProducts = useMemo(() => {
    return products?.filter(
      (p) =>
        p.description.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch)
    ) || [];
  }, [products, productSearch]);

  const addProduct = (product: any) => {
    // Check if product already exists in items
    const exists = items.some((item) => item.productId === product.id);
    if (exists) {
      toast({ title: "המוצר כבר קיים בהצעת המחיר", variant: "destructive" });
      return;
    }

    append({ productId: product.id, quantity: 1 });
    setIsProductSelectorOpen(false);
  };

  const getProductDetails = (productId: number) => {
    return products?.find((p) => p.id === productId);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const product = getProductDetails(item.productId);
      if (!product) return total;
      return total + (product.pricePerKg * product.weightKg * item.quantity);
    }, 0);
  };

  const onSubmit = (data: QuoteFormValues) => {
    createQuote.mutate(
      { data },
      {
        onSuccess: (newQuote) => {
          queryClient.invalidateQueries({ queryKey: getListQuotesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetQuotesSummaryQueryKey() });
          toast({ title: "הצעת המחיר נוצרה בהצלחה!" });
          setLocation(`/quotes/${newQuote.id}`);
        },
        onError: () => toast({ title: "שגיאה ביצירת הצעת מחיר", variant: "destructive" })
      }
    );
  };

  return (
    <Layout>
      <div className="flex items-center mb-8 gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/quotes")}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">הצעת מחיר חדשה</h1>
          <p className="text-muted-foreground mt-1">מלא את פרטי הלקוח והוסף מוצרים</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>פרטי הלקוח</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם לקוח / חברה</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>טלפון (אופציונלי)</FormLabel>
                      <FormControl>
                        <Input {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תאריך</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>פריטים להזמנה</CardTitle>
              <Dialog open={isProductSelectorOpen} onOpenChange={setIsProductSelectorOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 ml-2" />
                    הוסף פריט
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>בחר מוצר מהקטלוג</DialogTitle>
                  </DialogHeader>
                  <div className="relative mb-4">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="חיפוש לפי תיאור או ברקוד..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="max-h-[400px] overflow-y-auto rounded-md border">
                    {isLoadingProducts ? (
                      <div className="p-4 text-center">טוען מוצרים...</div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">ברקוד</TableHead>
                            <TableHead className="text-right">תיאור</TableHead>
                            <TableHead className="text-right">מחיר לק״ג</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono">{p.barcode}</TableCell>
                              <TableCell>{p.description}</TableCell>
                              <TableCell>{formatCurrency(p.pricePerKg)}</TableCell>
                              <TableCell className="text-left">
                                <Button size="sm" onClick={() => addProduct(p)}>
                                  בחר
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                  לא נבחרו פריטים. לחץ על "הוסף פריט" כדי להתחיל.
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-right">ברקוד</TableHead>
                        <TableHead className="text-right">תיאור פריט</TableHead>
                        <TableHead className="text-right">סה"כ משקל (ק"ג)</TableHead>
                        <TableHead className="text-right">מחיר לק"ג</TableHead>
                        <TableHead className="text-right w-[150px]">כמות להזמנה</TableHead>
                        <TableHead className="text-right">סה"כ מחיר</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const product = getProductDetails(items[index].productId);
                        if (!product) return null;
                        
                        const quantity = items[index].quantity || 0;
                        const totalWeight = product.weightKg * quantity;
                        const itemTotal = product.pricePerKg * totalWeight;

                        return (
                          <TableRow key={field.id}>
                            <TableCell className="font-mono text-sm">{product.barcode}</TableCell>
                            <TableCell className="font-medium">{product.description}</TableCell>
                            <TableCell>{formatNumber(totalWeight)} ק״ג</TableCell>
                            <TableCell>{formatCurrency(product.pricePerKg)}</TableCell>
                            <TableCell>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem className="mb-0">
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        className="h-8 text-center" 
                                        {...field} 
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </TableCell>
                            <TableCell className="font-bold">{formatCurrency(itemTotal)}</TableCell>
                            <TableCell className="text-left">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive h-8 w-8 hover:bg-destructive/10" 
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {form.formState.errors.items && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.items.message}
                </p>
              )}

              <div className="flex justify-end mt-6">
                <div className="bg-primary/10 p-4 rounded-lg flex items-center gap-6 min-w-[300px] justify-between">
                  <span className="text-lg font-medium">סה״כ לתשלום:</span>
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>הערות נוספות להצעת המחיר</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/quotes")}>
              ביטול
            </Button>
            <Button type="submit" size="lg" className="px-8 shadow-md" disabled={createQuote.isPending}>
              {createQuote.isPending ? "שומר..." : "שמור הצעת מחיר"}
              <Check className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </form>
      </Form>
    </Layout>
  );
}
