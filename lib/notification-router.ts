import { Row } from "@/lib/data";

/**
 * Determine the preferred notification channel for a tenant.
 * Returns 'telegram' if tenant has a telegram_id, 'whatsapp' otherwise.
 */
export function preferredChannel(tenant: Row): "telegram" | "whatsapp" {
  return tenant.telegram_id ? "telegram" : "whatsapp";
}

type IntegrationConfig = { botUrl: string; apiKey: string };

/**
 * Send a notification to a tenant via their preferred channel.
 * Falls back to WhatsApp URL if Telegram is unavailable or fails.
 */
export async function sendNotification(
  tenant: Row,
  message: string,
  config: IntegrationConfig
): Promise<{ channel: "telegram" | "whatsapp"; success: boolean; url?: string }> {
  const channel = preferredChannel(tenant);

  if (channel === "telegram") {
    try {
      const response = await fetch(`${config.botUrl}/api/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
        },
        body: JSON.stringify({
          chat_id: Number(tenant.telegram_id),
          text: message,
        }),
      });
      if (response.ok) return { channel: "telegram", success: true };
    } catch {
      // Telegram failed — fall through to WhatsApp
    }
  }

  // Fallback to WhatsApp
  const digits = String(tenant.telepon || "").replace(/\D/g, "");
  const waUrl = `https://wa.me/${digits.startsWith("0") ? `62${digits.slice(1)}` : digits}`;
  return { channel: "whatsapp", success: true, url: waUrl };
}
