import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getUser();

  if (user) {
    redirect("/pools");
  } else {
    redirect("/login");
  }
}
