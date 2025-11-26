import { ReactNode } from "react";
import { Header } from "./Header";
import { ModelType } from "./SettingsDialog";

interface BuilderLayoutProps {
  children: ReactNode;
  onSettingsChange: (model: ModelType) => void;
  mode: "web" | "contract";
  onModeChange: (mode: "web" | "contract") => void;
}

export const BuilderLayout = ({ children, onSettingsChange, mode, onModeChange }: BuilderLayoutProps) => {
  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      <Header onSettingsChange={onSettingsChange} mode={mode} onModeChange={onModeChange} />
      
      <div className="flex-1 flex overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};
