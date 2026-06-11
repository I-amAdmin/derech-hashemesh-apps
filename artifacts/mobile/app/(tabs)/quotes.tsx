import { useListQuotes } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Quote } from "@workspace/api-client-react";

type StatusFilter = "all" | "pending" | "approved" | "cancelled";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "cancelled", label: "Cancelled" },
];

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

function QuoteCard({ quote, onPress }: { quote: Quote; onPress: () => void }) {
  const colors = useColors();
  const date = new Date(quote.date).toLocaleDateString("en-IL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <Pressable
      testID={`quote-card-${quote.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.cardCustomer, { color: colors.foreground }]} numberOfLines={1}>
          {quote.customerName}
        </Text>
        <View style={styles.cardTopRight}>
          {quote.viewedAt ? (
            <View style={[styles.viewedBadge, { backgroundColor: colors.viewedBg }]}>
              <Feather name="eye" size={11} color={colors.viewed} />
              <Text style={[styles.viewedBadgeText, { color: colors.viewed }]}>נצפה</Text>
            </View>
          ) : null}
          <StatusBadge status={quote.status} />
        </View>
      </View>
      {quote.contactName ? (
        <Text style={[styles.cardContact, { color: colors.mutedForeground }]} numberOfLines={1}>
          {quote.contactName}
        </Text>
      ) : null}
      <View style={styles.cardBottom}>
        <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{date}</Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardItems, { color: colors.mutedForeground }]}>
            {quote.itemCount} {quote.itemCount === 1 ? "item" : "items"}
          </Text>
          <Text style={[styles.cardAmount, { color: colors.primary }]}>
            ₪{Number(quote.totalAmount).toLocaleString("en-IL", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function QuotesScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 60;

  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data, isLoading, isError, refetch, isRefetching } = useListQuotes();

  const allQuotes = data ?? [];
  const filtered =
    filter === "all" ? allQuotes : allQuotes.filter((q) => q.status === filter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: 16 }}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            progressViewOffset={topPad + 90}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: topPad + 16 }}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>Quotes</Text>
            <View style={[styles.filterBar, { backgroundColor: colors.muted }]}>
              {STATUS_FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  style={[
                    styles.filterChip,
                    filter === f.key && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setFilter(f.key);
                  }}
                  testID={`filter-${f.key}`}
                >
                  <Text
                    style={[
                      styles.filterLabel,
                      { color: filter === f.key ? colors.primary : colors.mutedForeground },
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {isLoading && (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            )}
            {isError && (
              <Pressable
                onPress={() => refetch()}
                style={[styles.errorBox, { backgroundColor: colors.accent, borderColor: colors.border }]}
              >
                <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                  Could not load quotes. Tap to retry.
                </Text>
              </Pressable>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No quotes</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {filter === "all" ? "Create your first quote" : `No ${filter} quotes`}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <QuoteCard
            quote={item}
            onPress={() => router.push(`/quote/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  filterBar: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 2,
  },
  filterChip: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  filterLabel: { fontSize: 13, fontWeight: "600" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  viewedBadge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  viewedBadgeText: { fontSize: 11, fontWeight: "600" },
  cardCustomer: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 8 },
  cardContact: { fontSize: 13, marginBottom: 10 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  cardDate: { fontSize: 13 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardItems: { fontSize: 13 },
  cardAmount: { fontSize: 16, fontWeight: "700" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  emptyState: { marginTop: 60, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
  emptyText: { fontSize: 14 },
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 20, alignItems: "center" },
  errorText: { fontSize: 14 },
});
