"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PresetScenario, PresetId } from "@/hooks/use-preset-demo";

interface DemoPresetTabsProps {
  presets: PresetScenario[];
  activePreset: PresetId;
  onPresetChange: (id: PresetId) => void;
}

export function DemoPresetTabs({
  presets,
  activePreset,
  onPresetChange,
}: DemoPresetTabsProps) {
  const activeDescription = presets.find((p) => p.id === activePreset)?.description;

  return (
    <div className="flex flex-col gap-2">
      <Tabs
        value={activePreset}
        onValueChange={(v) => onPresetChange(v as PresetId)}
      >
        <TabsList className="w-full">
          {presets.map((preset) => (
            <TabsTrigger key={preset.id} value={preset.id} className="flex-1 text-sm">
              {preset.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {activeDescription && (
        <p className="text-xs text-muted-foreground text-center">
          {activeDescription}
        </p>
      )}
    </div>
  );
}
