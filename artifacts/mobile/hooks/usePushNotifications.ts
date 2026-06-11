import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PermissionsWithGranted = { granted: boolean; canAskAgain: boolean };

async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const existing = await Notifications.getPermissionsAsync();
  const { granted: alreadyGranted } = existing as unknown as PermissionsWithGranted;

  if (!alreadyGranted) {
    const after = await Notifications.requestPermissionsAsync();
    const { granted: nowGranted } = after as unknown as PermissionsWithGranted;
    if (!nowGranted) return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

async function sendTokenToServer(token: string): Promise<void> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : "";
    await fetch(`${baseUrl}/api/push-tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
  } catch {
  }
}

function navigateToQuote(router: ReturnType<typeof useRouter>, data: Record<string, unknown>) {
  const quoteId = data?.quoteId;
  if (quoteId) {
    router.push(`/quote/${quoteId}` as never);
  }
}

export function usePushNotifications() {
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        sendTokenToServer(token);
      }
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data as Record<string, unknown>;
        navigateToQuote(router, data);
      }
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      navigateToQuote(router, data);
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [router]);
}
