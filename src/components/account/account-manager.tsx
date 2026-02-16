"use client";

import { useState } from "react";
import { Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

import { useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

interface AccountManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountManager({ open, onOpenChange }: AccountManagerProps) {
  const {
    accounts,
    createAccount,
    renameAccount,
    deleteAccount,
    isCreating,
    isDeleting,
  } = useAccounts();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      toast.error("계좌 이름을 입력해주세요.");
      return;
    }
    try {
      await createAccount(name);
      setNewName("");
      toast.success(`"${name}" 계좌가 생성되었습니다.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "계좌 생성에 실패했습니다.",
      );
    }
  }

  function handleStartRename(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  function handleRename() {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) {
      toast.error("계좌 이름을 입력해주세요.");
      return;
    }
    renameAccount(editingId, name);
    setEditingId(null);
    toast.success("계좌 이름이 변경되었습니다.");
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const account = accounts.find((a) => a.id === deleteTarget);
    deleteAccount(deleteTarget);
    setDeleteTarget(null);
    toast.success(`"${account?.name ?? "계좌"}"가 삭제되었습니다.`);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>계좌 관리</DialogTitle>
            <DialogDescription>
              계좌를 추가, 수정, 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Create new account */}
            <div className="flex gap-2">
              <Input
                placeholder="새 계좌 이름 (예: 키움증권)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                size="sm"
                className="shrink-0"
              >
                <Plus className="size-4" />
                추가
              </Button>
            </div>

            {/* Account list */}
            {accounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm">
                  아직 계좌가 없습니다. 새 계좌를 추가해보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    {editingId === account.id ? (
                      <div className="flex flex-1 gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="h-8"
                        />
                        <Button
                          size="sm"
                          variant="default"
                          onClick={handleRename}
                        >
                          저장
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          취소
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 font-medium text-sm truncate">
                          {account.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            handleStartRename(account.id, account.name)
                          }
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(account.id)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              총 {accounts.length}개 계좌
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>계좌 삭제</DialogTitle>
            <DialogDescription>
              이 계좌와 모든 보유 종목이 삭제됩니다. 진행 중인 리밸런싱 세션이
              있는 경우 삭제할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">취소</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
