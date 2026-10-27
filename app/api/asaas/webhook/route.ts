import { revalidateTag } from "next/cache";
import { receiveAsaasEvent, webhookTokenMatches } from "@/lib/asaas";

export async function POST(request: Request) {
  if (!webhookTokenMatches(request.headers.get("asaas-access-token"))) {
    return Response.json({ received: false }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ received: false }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ received: false }, { status: 400 });
  }

  try {
    const result = await receiveAsaasEvent(body);

    if (result.stockChanged) {
      revalidateTag("catalog", "max");
    }

    return Response.json({ received: result.status === 200 }, { status: result.status });
  } catch {
    return Response.json({ received: false }, { status: 500 });
  }
}
