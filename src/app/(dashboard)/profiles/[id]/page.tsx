"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useProfiles } from "@/hooks/use-profiles";
import { ProfileForm } from "@/components/rebalance/profile-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageTransition } from "@/components/layout/page-transition";

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { getProfile, updateProfile } = useProfiles();

  const profile = getProfile(id);

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">프로필을 찾을 수 없습니다.</h1>
        <Button asChild>
          <Link href="/profiles">프로필 목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient">프로필 수정</h1>
      <ProfileForm
        initialData={profile}
        onSubmit={(data) => {
          updateProfile(id, data);
          toast.success("프로필이 수정되었습니다.");
          router.push("/profiles");
        }}
        onCancel={() => router.back()}
      />
      <Separator />
      <Button asChild>
        <Link href={`/rebalance/simulate?profile=${id}`}>
          이 프로필로 리밸런싱
        </Link>
      </Button>
    </div>
    </PageTransition>
  );
}
