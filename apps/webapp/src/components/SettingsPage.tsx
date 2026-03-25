import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@showwhat/configurator";
import { ArrowLeft } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useDefinitionStore } from "../store/definition-store.js";
import { usePresetStore } from "../store/preset-store.js";
import { SourceSettings } from "./SourceSettings.js";
import { PresetEditor, InlinePresetList } from "./PresetSettings.js";

type SettingsTab = "sources" | "presets";

export function SettingsPage({
  tab,
  onTabChange,
  onBack,
}: {
  tab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  onBack: () => void;
}) {
  const { clearAll, inlinePresets } = useDefinitionStore(
    useShallow((s) => ({
      clearAll: s.clearAll,
      inlinePresets: s.inlinePresets,
    })),
  );
  const customPresets = usePresetStore((s) => s.presets);

  function handleCloseSource() {
    clearAll();
    onBack();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 items-center gap-3 border-b border-border px-4">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">Settings</span>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as SettingsTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex justify-center border-b border-border py-2">
          <TabsList>
            <TabsTrigger value="sources">Source</TabsTrigger>
            <TabsTrigger value="presets">Presets</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="sources" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl p-8">
            <SourceSettings onCloseSource={handleCloseSource} />
          </div>
        </TabsContent>
        <TabsContent value="presets" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-8">
            <div className="flex flex-col gap-8 lg:flex-row">
              <div className="flex-1">
                <PresetEditor />
              </div>
              <div className="lg:w-80">
                <InlinePresetList inlinePresets={inlinePresets} customPresets={customPresets} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
