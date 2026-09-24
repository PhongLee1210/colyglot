import { getCurrentUser } from "@/lib/auth/session";
import { AccountMenu } from "./account-menu";

export async function AccountMenuGate() {
  const user = await getCurrentUser();
  if (!user?.email) {
    return null;
  }
  return <AccountMenu email={user.email} />;
}
