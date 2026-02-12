"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useProfiles } from "@/hooks/use-profiles";
import { ProfileForm } from "@/components/rebalance/profile-form";

export default function NewProfilePage() {
  const router = useRouter();
  const { addProfile } = useProfiles();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">새 프로필 만들기</h1>
      <ProfileForm
        onSubmit={(data) => {
          addProfile(data);
          toast.success("프로필이 생성되었습니다.");
          router.push("/profiles");
        }}
        onCancel={() => router.back()}
      />
    </div>
  );
}
