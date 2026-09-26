import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CAMPAIGN_END, CAMPAIGN_END_LABEL, CONTACT_EMAIL, isCampaignActive, isTenantReadOnly, isTenantSubscribed } from "@/lib/campaign";

// Panel üstündeki kampanya / abonelik bandı için durum bilgisi
export async function GET() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? null;
  return NextResponse.json({
    campaignActive: isCampaignActive(),
    campaignEnd: CAMPAIGN_END.toISOString(),
    campaignEndLabel: CAMPAIGN_END_LABEL,
    subscribed: isTenantSubscribed(tenantId),
    readOnly: session?.user?.isSuperAdmin ? false : isTenantReadOnly(tenantId),
    contactEmail: CONTACT_EMAIL,
  });
}
