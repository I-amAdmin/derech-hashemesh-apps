import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushNotifications(message: PushMessage): Promise<void> {
  const tokens = await db.select({ token: pushTokensTable.token }).from(pushTokensTable);
  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(messages),
  });
}
