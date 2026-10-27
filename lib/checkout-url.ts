export function checkoutPageUrl(id: string, sandbox: boolean) {
  const origin = sandbox ? "https://sandbox.asaas.com" : "https://asaas.com";
  return `${origin}/checkoutSession/show?id=${encodeURIComponent(id)}`;
}

export function publicCheckoutUrl(stored: string | null) {
  if (!stored) {
    return null;
  }

  try {
    const url = new URL(stored);
    const fromQuery = url.searchParams.get("id");

    if (url.pathname.includes("/checkoutSession/show") && fromQuery) {
      return checkoutPageUrl(fromQuery, url.hostname.includes("sandbox"));
    }

    const parts = url.pathname.split("/").filter(Boolean);
    const show = parts.indexOf("checkoutSession");
    const id = show >= 0 && parts[show + 1] === "show" ? parts[show + 2] : "";

    if (id) {
      return checkoutPageUrl(id, url.hostname.includes("sandbox"));
    }
  } catch {
    return stored;
  }

  return stored;
}
