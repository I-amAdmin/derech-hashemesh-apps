import {
  useCreateQuote,
  useListCustomers,
  useListProducts,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { Product, Customer, QuoteItemInput } from "@workspace/api-client-react";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewQuoteScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const [step, setStep] = useState<"customer" | "products" | "review">("customer");
  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const { data: products, isLoading: productsLoading } = useListProducts();
  const { data: customers } = useListCustomers();
  const { mutate: createQuote, isPending: creating } = useCreateQuote();

  const filteredProducts = (products ?? []).filter(
    (p) =>
      !productSearch ||
      p.description.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  );

  const cartTotal = cart.reduce(
    (sum, ci) => sum + ci.product.weightKg * ci.product.pricePerKg * ci.quantity,
    0
  );

  function adjustQty(product: Product, delta: number) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (!existing && delta > 0) return [...prev, { product, quantity: delta }];
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter((c) => c.product.id !== product.id);
      return prev.map((c) => (c.product.id === product.id ? { ...c, quantity: newQty } : c));
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function getQty(productId: number): number {
    return cart.find((c) => c.product.id === productId)?.quantity ?? 0;
  }

  function handleSubmit() {
    if (!customerName.trim()) {
      Alert.alert("Missing info", "Please enter a customer name.");
      return;
    }
    if (cart.length === 0) {
      Alert.alert("Empty cart", "Please add at least one product.");
      return;
    }
    const items: QuoteItemInput[] = cart.map((ci) => ({
      productId: ci.product.id,
      quantity: ci.quantity,
    }));
    createQuote(
      {
        data: {
          customerName: customerName.trim(),
          contactName: contactName.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          date,
          notes: notes.trim() || undefined,
          items,
        },
      },
      {
        onSuccess: (quote) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
          queryClient.invalidateQueries({ queryKey: ["/api/quotes/summary"] });
          setStep("customer");
          setCustomerName("");
          setContactName("");
          setPhone("");
          setNotes("");
          setCart([]);
          setDate(new Date().toISOString().slice(0, 10));
          setSelectedCustomer(null);
          router.push(`/quote/${quote.id}`);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Error", "Failed to create quote. Please try again.");
        },
      }
    );
  }

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerName(c.businessName);
    setContactName(c.contactName ?? "");
    setPhone(c.phone ?? "");
    setShowCustomerPicker(false);
  }

  const stepLabels = ["Customer", "Products", "Review"];
  const stepIndex = step === "customer" ? 0 : step === "products" ? 1 : 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad, paddingHorizontal: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>New Quote</Text>

        <View style={[styles.stepBar, { backgroundColor: colors.muted }]}>
          {stepLabels.map((label, idx) => (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: idx <= stepIndex ? colors.primary : colors.border,
                    borderColor: idx <= stepIndex ? colors.primary : colors.border,
                  },
                ]}
              >
                {idx < stepIndex ? (
                  <Feather name="check" size={12} color="#fff" />
                ) : (
                  <Text style={{ color: idx <= stepIndex ? "#fff" : colors.mutedForeground, fontSize: 11, fontWeight: "700" }}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text style={[styles.stepLabel, { color: idx <= stepIndex ? colors.primary : colors.mutedForeground }]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        {step === "customer" && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Customer</Text>

            {(customers ?? []).length > 0 && (
              <Pressable
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.accent }]}
                onPress={() => setShowCustomerPicker((v) => !v)}
              >
                <Text style={[styles.pickerBtnText, { color: colors.accentForeground }]}>
                  {selectedCustomer ? selectedCustomer.businessName : "Select existing customer"}
                </Text>
                <Feather name={showCustomerPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              </Pressable>
            )}

            {showCustomerPicker && (
              <View style={[styles.pickerList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {(customers ?? []).map((c) => (
                  <Pressable
                    key={c.id}
                    style={({ pressed }) => [styles.pickerItem, { backgroundColor: pressed ? colors.accent : "transparent" }]}
                    onPress={() => selectCustomer(c)}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.foreground }]}>{c.businessName}</Text>
                    {c.contactName ? (
                      <Text style={[styles.pickerItemSub, { color: colors.mutedForeground }]}>{c.contactName}</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Business Name *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. ABC Wholesale"
              placeholderTextColor={colors.mutedForeground}
              testID="customer-name-input"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Contact Name</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={contactName}
              onChangeText={setContactName}
              placeholder="Contact person"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="05x-xxxxxxx"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Quote Date</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                if (!customerName.trim()) {
                  Alert.alert("Required", "Please enter a business name.");
                  return;
                }
                setStep("products");
              }}
              testID="next-to-products"
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Next: Add Products</Text>
              <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        )}

        {step === "products" && (
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Products</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search products..."
                placeholderTextColor={colors.mutedForeground}
                testID="product-search"
              />
              {productsLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
              {filteredProducts.map((p) => {
                const qty = getQty(p.id);
                const itemPrice = p.weightKg * p.pricePerKg;
                return (
                  <View key={p.id} style={[styles.productRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                        {p.description}
                      </Text>
                      <Text style={[styles.productMeta, { color: colors.mutedForeground }]}>
                        {p.weightKg}kg · ₪{p.pricePerKg}/kg · ₪{itemPrice.toFixed(2)} each
                      </Text>
                    </View>
                    <View style={styles.qtyControl}>
                      <Pressable
                        style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: qty > 0 ? colors.accent : colors.muted }]}
                        onPress={() => adjustQty(p, -1)}
                        testID={`qty-dec-${p.id}`}
                      >
                        <Feather name="minus" size={14} color={colors.foreground} />
                      </Pressable>
                      <Text style={[styles.qtyText, { color: colors.foreground }]}>{qty}</Text>
                      <Pressable
                        style={[styles.qtyBtn, { borderColor: colors.border, backgroundColor: colors.primary }]}
                        onPress={() => adjustQty(p, 1)}
                        testID={`qty-inc-${p.id}`}
                      >
                        <Feather name="plus" size={14} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {cart.length > 0 && (
              <View style={[styles.cartSummary, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <Text style={[styles.cartSummaryText, { color: colors.accentForeground }]}>
                  {cart.length} product{cart.length !== 1 ? "s" : ""} · ₪{cartTotal.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.navRow}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setStep("customer")}
              >
                <Feather name="arrow-left" size={18} color={colors.foreground} />
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: cart.length === 0 ? colors.muted : colors.primary, opacity: pressed ? 0.85 : 1, flex: 1 },
                ]}
                onPress={() => {
                  if (cart.length === 0) {
                    Alert.alert("No products", "Add at least one product.");
                    return;
                  }
                  setStep("review");
                }}
                testID="next-to-review"
              >
                <Text style={[styles.primaryBtnText, { color: cart.length === 0 ? colors.mutedForeground : colors.primaryForeground }]}>
                  Review Quote
                </Text>
                <Feather name="arrow-right" size={18} color={cart.length === 0 ? colors.mutedForeground : colors.primaryForeground} />
              </Pressable>
            </View>
          </View>
        )}

        {step === "review" && (
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Review Quote</Text>

              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Customer</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{customerName}</Text>
              </View>
              {contactName ? (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Contact</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{contactName}</Text>
                </View>
              ) : null}
              {phone ? (
                <View style={styles.reviewRow}>
                  <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Phone</Text>
                  <Text style={[styles.reviewValue, { color: colors.foreground }]}>{phone}</Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={[styles.reviewLabel, { color: colors.mutedForeground }]}>Date</Text>
                <Text style={[styles.reviewValue, { color: colors.foreground }]}>{date}</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {cart.map((ci) => (
                <View key={ci.product.id} style={styles.reviewItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewItemName, { color: colors.foreground }]} numberOfLines={2}>
                      {ci.product.description}
                    </Text>
                    <Text style={[styles.reviewItemMeta, { color: colors.mutedForeground }]}>
                      {ci.quantity} × ₪{(ci.product.weightKg * ci.product.pricePerKg).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={[styles.reviewItemTotal, { color: colors.primary }]}>
                    ₪{(ci.quantity * ci.product.weightKg * ci.product.pricePerKg).toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.reviewRow}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  ₪{cartTotal.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.navRow}>
              <Pressable
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setStep("products")}
              >
                <Feather name="arrow-left" size={18} color={colors.foreground} />
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Back</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: creating ? colors.muted : colors.primary, opacity: pressed ? 0.85 : 1, flex: 1 },
                ]}
                onPress={handleSubmit}
                disabled={creating}
                testID="submit-quote"
              >
                {creating ? (
                  <ActivityIndicator color={colors.primaryForeground} size="small" />
                ) : (
                  <>
                    <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Create Quote</Text>
                    <Feather name="check" size={18} color={colors.primaryForeground} />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontWeight: "700", marginBottom: 20 },
  stepBar: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    justifyContent: "space-around",
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 11, fontWeight: "600" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "600" },
  navRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  pickerBtnText: { fontSize: 14, fontWeight: "500" },
  pickerList: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 10 },
  pickerItemText: { fontSize: 14, fontWeight: "600" },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  productMeta: { fontSize: 12 },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qtyText: { width: 24, textAlign: "center", fontSize: 15, fontWeight: "700" },
  cartSummary: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  cartSummaryText: { fontSize: 14, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  reviewLabel: { fontSize: 14 },
  reviewValue: { fontSize: 14, fontWeight: "600" },
  reviewItem: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8 },
  reviewItemName: { fontSize: 14, fontWeight: "600" },
  reviewItemMeta: { fontSize: 12, marginTop: 2 },
  reviewItemTotal: { fontSize: 14, fontWeight: "700", marginLeft: 12 },
  totalLabel: { fontSize: 16, fontWeight: "700" },
  totalValue: { fontSize: 18, fontWeight: "800" },
});
