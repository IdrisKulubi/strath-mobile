import { redirect } from "next/navigation";

// Messages page redirects to matches (where conversations are shown)
export default function MessagesPage() {
  redirect("/app/matches");
}
