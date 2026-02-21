export interface StatusConfig {
  label: string;
  variant: "success" | "secondary" | "destructive" | "default" | "outline";
  dotColor: string;
  bgColor: string;
  textColor: string;
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: {
    label: "완료",
    variant: "success",
    dotColor: "bg-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/50",
    textColor: "text-green-800 dark:text-green-300",
  },
  partial: {
    label: "부분 완료",
    variant: "secondary",
    dotColor: "bg-yellow-500",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/50",
    textColor: "text-yellow-800 dark:text-yellow-300",
  },
  failed: {
    label: "실패",
    variant: "destructive",
    dotColor: "bg-red-500",
    bgColor: "bg-red-100 dark:bg-red-900/50",
    textColor: "text-red-800 dark:text-red-300",
  },
  in_progress: {
    label: "진행중",
    variant: "default",
    dotColor: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
    textColor: "text-blue-800 dark:text-blue-300",
  },
  abandoned: {
    label: "포기",
    variant: "outline",
    dotColor: "bg-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-700",
    textColor: "text-slate-800 dark:text-slate-300",
  },
};

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.completed;
}
