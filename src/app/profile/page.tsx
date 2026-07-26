import { Suspense } from "react";
import { ProfileForm } from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileForm />
    </Suspense>
  );
}
