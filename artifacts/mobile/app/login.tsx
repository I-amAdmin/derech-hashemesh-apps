import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refetch } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  async function handleLogin() {
    if (!password.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        refetch();
      } else {
        const data: { error?: string } = await res.json().catch(() => ({}));
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>דרך השמש</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>מערכת הצעות מחיר</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>סיסמה</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="הכנס סיסמה"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            returnKeyType="go"
            autoFocus
            editable={!loading}
          />

          {error ? (
            <Text style={[styles.error, { color: colors.destructive ?? "#ef4444" }]}>{error}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary, opacity: pressed || loading || !password.trim() ? 0.6 : 1 },
            ]}
            onPress={handleLogin}
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>כניסה</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 15 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  label: { fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlign: "right",
  },
  error: { fontSize: 13 },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
