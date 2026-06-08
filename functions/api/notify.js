export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const webhookUrl = context.env.DISCORD_WEBHOOK;
  if (!webhookUrl) {
    return new Response("Webhook not configured", { status: 500 });
  }

  try {
    const { orderId, discord, type, complexity, timeline, price, desc } =
      await context.request.json();

    const body = {
      content:
        `\uD83D\uDD35 **New order ${orderId}**\n` +
        `Discord: ${discord}\n` +
        `Type: ${type} \u00B7 ${complexity} \u00B7 ${timeline}\n` +
        `Estimate: $${price?.min}\u2013$${price?.max}` +
        (desc ? `\n> ${desc}` : ""),
    };

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      return new Response(`Discord error: ${resp.status}`, { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
}
