"use client";

import { useState, useCallback, useRef } from "react";
import { Sparkles, Loader2, Trash2, Plus, AlertCircle, ImageIcon, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  useAIParsePortfolio,
  type ParsedStock,
} from "@/hooks/use-ai-parse-portfolio";
import { useAIParsePortfolioImage } from "@/hooks/use-ai-parse-portfolio-image";
import type { ManualStockInput } from "@/hooks/use-manual-portfolio";
import { AI_DISCLAIMER_SHORT, AI_GENERATED_LABEL } from "@/lib/ai/disclaimer";

type InputMode = "text" | "image";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (stocks: ManualStockInput[]) => void;
  existingStockCodes?: string[];
}

export function BulkImportDialog({
  open,
  onOpenChange,
  onImport,
  existingStockCodes = [],
}: BulkImportDialogProps) {
  const [text, setText] = useState("");
  const [parsedStocks, setParsedStocks] = useState<ParsedStock[]>([]);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: parsePortfolio, isPending } = useAIParsePortfolio();
  const { mutate: parseImage, isPending: isImagePending } = useAIParsePortfolioImage();

  const isAnalyzing = isPending || isImagePending;

  const handleParse = useCallback(() => {
    if (!text.trim()) {
      toast.error("텍스트를 입력해주세요.");
      return;
    }

    parsePortfolio(text, {
      onSuccess: (data) => {
        if (data.stocks.length === 0) {
          toast.error("종목 정보를 인식하지 못했습니다. 다른 형식으로 시도해주세요.");
          return;
        }
        setParsedStocks(data.stocks);
        setStep("preview");
        toast.success(`${data.stocks.length}개 종목이 인식되었습니다.`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }, [text, parsePortfolio]);

  const handleRemoveStock = useCallback((index: number) => {
    setParsedStocks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReset = useCallback(() => {
    setText("");
    setParsedStocks([]);
    setStep("input");
    setImagePreview(null);
    setSelectedFile(null);
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("JPG, PNG, WebP, GIF 이미지만 지원합니다.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("이미지가 너무 큽니다. 5MB 이하로 업로드해주세요.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }, []);

  const handleImageParse = useCallback(() => {
    if (!selectedFile) {
      toast.error("이미지를 선택해주세요.");
      return;
    }
    parseImage(selectedFile, {
      onSuccess: (data) => {
        if (data.stocks.length === 0) {
          toast.error("종목 정보를 인식하지 못했습니다. 더 선명한 스크린샷으로 시도해주세요.");
          return;
        }
        setParsedStocks(data.stocks);
        setStep("preview");
        toast.success(`${data.stocks.length}개 종목이 인식되었습니다.`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }, [selectedFile, parseImage]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleImportAll = useCallback(() => {
    const toImport: ManualStockInput[] = parsedStocks
      .filter((s) => !existingStockCodes.includes(s.stock_code ?? ""))
      .map((s) => ({
        stock_code: s.stock_code ?? s.stock_name,
        stock_name: s.stock_name,
        quantity: s.quantity,
        avg_price: s.avg_price,
        current_price: s.avg_price, // 현재가는 추후 갱신
        currency: s.currency,
      }));

    if (toImport.length === 0) {
      toast.error("추가할 종목이 없습니다. (모두 이미 등록된 종목입니다)");
      return;
    }

    onImport(toImport);
    toast.success(`${toImport.length}개 종목이 추가되었습니다.`);
    handleReset();
    onOpenChange(false);
  }, [parsedStocks, existingStockCodes, onImport, onOpenChange, handleReset]);

  const duplicateCount = parsedStocks.filter((s) =>
    existingStockCodes.includes(s.stock_code ?? ""),
  ).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            AI 대량 종목 추가
          </SheetTitle>
          <SheetDescription>
            텍스트를 붙여넣거나 스크린샷을 업로드하면 AI가 자동으로 인식합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {step === "input" ? (
            <>
              {/* 입력 모드 탭 */}
              <div className="flex rounded-xl border border-border/50 bg-muted/30 p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    inputMode === "text"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <FileText className="size-3.5" />
                  텍스트 붙여넣기
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("image")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    inputMode === "image"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ImageIcon className="size-3.5" />
                  스크린샷 업로드
                </button>
              </div>

              {inputMode === "text" ? (
                <>
                  {/* 입력 안내 */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">지원 형식 예시:</p>
                    <p>삼성전자 100주 평균단가 72,000원</p>
                    <p>AAPL 50주 $180.50</p>
                    <p>005930 삼성전자 100 72000</p>
                    <p>탭/쉼표/공백으로 구분된 텍스트</p>
                  </div>

                  {/* 텍스트 입력 */}
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={"여기에 보유종목 정보를 붙여넣으세요...\n\n예시:\n삼성전자 100주 72,000원\nSPY 50주 $520\nAAPL 30 180.50"}
                    className={cn(
                      "w-full min-h-[200px] rounded-xl border border-input bg-background px-3 py-2 text-sm",
                      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      "resize-y font-mono",
                    )}
                    disabled={isAnalyzing}
                  />

                  {/* 파싱 버튼 */}
                  <Button
                    onClick={handleParse}
                    disabled={isAnalyzing || !text.trim()}
                    className="w-full gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        AI 분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        AI로 종목 인식
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  {/* 이미지 안내 */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">사용 방법:</p>
                    <p>증권사 앱의 보유종목 화면을 캡쳐한 스크린샷을 업로드하세요.</p>
                    <p>JPG, PNG, WebP, GIF · 최대 5MB</p>
                  </div>

                  {/* 이미지 업로드 영역 */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />

                  {imagePreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl border border-border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreview}
                          alt="업로드된 스크린샷"
                          className="w-full max-h-[300px] object-contain bg-muted/20"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          setImagePreview(null);
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        다른 이미지 선택
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className={cn(
                        "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60",
                        "min-h-[200px] cursor-pointer transition-colors",
                        "hover:border-primary/50 hover:bg-muted/20",
                      )}
                    >
                      <ImageIcon className="size-10 text-muted-foreground/50" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                          클릭하거나 이미지를 드래그하세요
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          증권사 앱 스크린샷
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 이미지 파싱 버튼 */}
                  <Button
                    onClick={handleImageParse}
                    disabled={isAnalyzing || !selectedFile}
                    className="w-full gap-2"
                  >
                    {isImagePending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        AI 이미지 분석 중...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        AI로 스크린샷 인식
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {/* 프리뷰 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="size-3" />
                    {AI_GENERATED_LABEL}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {parsedStocks.length}개 인식
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  다시 입력
                </Button>
              </div>

              {/* 중복 경고 */}
              {duplicateCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-orange-500/30 bg-orange-50 p-3 dark:bg-orange-950/20">
                  <AlertCircle className="size-4 shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <p className="text-xs text-orange-800 dark:text-orange-200">
                    {duplicateCount}개 종목이 이미 포트폴리오에 있습니다. (자동 제외됨)
                  </p>
                </div>
              )}

              {/* 파싱 결과 리스트 */}
              <div className="space-y-2">
                {parsedStocks.map((stock, index) => {
                  const isDuplicate = existingStockCodes.includes(stock.stock_code ?? "");
                  return (
                    <div
                      key={`${stock.stock_name}-${index}`}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-sm",
                        isDuplicate && "opacity-50 bg-muted/50",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {stock.stock_name}
                          </span>
                          {stock.stock_code && (
                            <span className="text-xs text-muted-foreground font-mono shrink-0">
                              {stock.stock_code}
                            </span>
                          )}
                          {isDuplicate && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              중복
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                          {stock.quantity.toLocaleString("ko-KR")}주 ·{" "}
                          {stock.currency === "USD" ? "$" : ""}
                          {stock.avg_price.toLocaleString("ko-KR")}
                          {stock.currency === "KRW" ? "원" : ""}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 size-8"
                        onClick={() => handleRemoveStock(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* 면책 조항 */}
              <p className="text-[11px] text-muted-foreground text-center">
                {AI_DISCLAIMER_SHORT}
              </p>
            </>
          )}
        </div>

        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline" className="w-full rounded-xl">
              취소
            </Button>
          </SheetClose>
          {step === "preview" && parsedStocks.length > 0 && (
            <Button
              onClick={handleImportAll}
              className="w-full rounded-xl gap-2"
            >
              <Plus className="size-4" />
              {parsedStocks.length - duplicateCount}개 종목 추가
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
