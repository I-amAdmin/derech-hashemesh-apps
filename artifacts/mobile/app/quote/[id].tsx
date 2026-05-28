import {
  useGetQuote,
  useUpdateQuoteStatus,
  useGenerateQuoteShareToken,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";

function StatusBadge({ status }: { status: string }) {
  const colors = useColors();
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: colors.pendingBg, text: colors.pending },
    approved: { bg: colors.approvedBg, text: colors.approved },
    cancelled: { bg: colors.cancelledBg, text: colors.cancelled },
  };
  const s = map[status] ?? { bg: colors.muted, text: colors.mutedForeground };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const quoteId = Number(id);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const { data: quote, isLoading, isError, refetch } = useGetQuote(quoteId);

  const { mutate: updateStatus } = useUpdateQuoteStatus();
  const { mutate: getShareToken } = useGenerateQuoteShareToken();

  function handleStatusChange(newStatus: "approved" | "cancelled" | "pending") {
    Alert.alert(
      `Mark as ${newStatus}?`,
      `Change quote status to ${newStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          style: newStatus === "cancelled" ? "destructive" : "default",
          onPress: () => {
            setUpdatingStatus(newStatus);
            updateStatus(
              { id: quoteId, data: { status: newStatus } },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
                  queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/quotes/summary"] });
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert("Error", "Could not update status.");
                },
                onSettled: () => setUpdatingStatus(null),
              }
            );
          },
        },
      ]
    );
  }

  function handleShare() {
    setSharing(true);
    getShareToken(
      { id: quoteId },
      {
        onSuccess: (result: { shareToken: string }) => {
          const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";
          const url = `https://${domain}/q/${result.shareToken}`;
          Share.share({ message: `Quote from דרך השמש: ${url}`, url });
        },
        onError: () => Alert.alert("Error", "Could not generate share link."),
        onSettled: () => setSharing(false),
      }
    );
  }

  if (isLoading || !quote) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Quote not found</Text>
        <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryForeground, fontWeight: "600" }}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.mutedForeground }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const quoteDate = new Date(quote.date).toLocaleDateString("en-IL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 8, paddingBottom: bottomPad + 24, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            testID="back-btn"
          >
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1, backgroundColor: colors.muted }]}
              onPress={handleShare}
              disabled={sharing}
              testID="share-btn"
            >
              {sharing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="share-2" size={18} color={colors.foreground} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTop}>
            <Text style={[styles.quoteNumber, { color: colors.mutedForeground }]}>Quote #{quote.id}</Text>
            <StatusBadge status={quote.status} />
          </View>
          <Text style={[styles.customerName, { color: colors.foreground }]}>{quote.customerName}</Text>
          {quote.contactName ? (
            <Text style={[styles.contactName, { color: colors.mutedForeground }]}>{quote.contactName}</Text>
          ) : null}
          {quote.customerPhone ? (
            <Text style={[styles.contactName, { color: colors.mutedForeground }]}>{quote.customerPhone}</Text>
          ) : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <View>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Date</Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>{quoteDate}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                ₪{Number(quote.totalAmount).toLocaleString("en-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          {quote.notes ? (
            <View style={[styles.notesBox, { backgroundColor: colors.accent }]}>
              <Text style={[styles.notesText, { color: colors.accentForeground }]}>{quote.notes}</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Items ({quote.items.length})
        </Text>

        {quote.items.map((item, idx) => (
          <View
            key={item.id}
            style={[
              styles.itemRow,
              { backgroundColor: colors.card, borderColor: colors.border },
              idx === 0 && styles.itemFirst,
              idx === quote.items.length - 1 && styles.itemLast,
            ]}
          >
            <View style={styles.itemLeft}>
              <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
                {item.description}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                {item.weightKg}kg · ₪{item.pricePerKg}/kg · qty {item.quantity}
              </Text>
            </View>
            <Text style={[styles.itemTotal, { color: colors.primary }]}>
              ₪{Number(item.totalPrice).toLocaleString("en-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        ))}

        {quote.status === "pending" && (
          <View style={styles.actionsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.approvedBg, borderColor: colors.approved, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleStatusChange("approved")}
                disabled={!!updatingStatus}
                testID="approve-btn"
              >
                {updatingStatus === "approved" ? (
                  <ActivityIndicator size="small" color={colors.approved} />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color={colors.approved} />
                    <Text style={[styles.actionBtnText, { color: colors.approved }]}>Approve</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.cancelledBg, borderColor: colors.cancelled, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => handleStatusChange("cancelled")}
                disabled={!!updatingStatus}
                testID="cancel-btn"
              >
                {updatingStatus === "cancelled" ? (
                  <ActivityIndicator size="small" color={colors.cancelled} />
                ) : (
                  <>
                    <Feather name="x-circle" size={18} color={colors.cancelled} />
                    <Text style={[styles.actionBtnText, { color: colors.cancelled }]}>Cancel</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {quote.status === "approved" && (
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnFull,
                { backgroundColor: colors.pendingBg, borderColor: colors.pending, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleStatusChange("pending")}
              disabled={!!updatingStatus}
            >
              <Feather name="clock" size={18} color={colors.pending} />
              <Text style={[styles.actionBtnText, { color: colors.pending }]}>Revert to Pending</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "600" },
  retryBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24, marginTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  backBtn: { padding: 4 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 20 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  quoteNumber: { fontSize: 13, fontWeight: "500" },
  customerName: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  contactName: { fontSize: 14, marginBottom: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  metaLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  metaValue: { fontSize: 15, fontWeight: "600" },
  totalAmount: { fontSize: 24, fontWeight: "800" },
  notesBox: { borderRadius: 8, padding: 12, marginTop: 14 },
  notesText: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    padding: 14,
    borderBottomWidth: 0,
  },
  itemFirst: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  itemLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1, marginBottom: 20 },
  itemLeft: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 14, fontWeight: "600", marginBottom: 3 },
  itemMeta: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: "700" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  actionsSection: { marginBottom: 12 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
  },
  actionBtnFull: { flex: undefined },
  actionBtnText: { fontSize: 14, fontWeight: "700" },
});
