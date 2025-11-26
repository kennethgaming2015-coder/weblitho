import { ReactNode } from "react";
import { Header } from "./Header";

interface BuilderLayoutProps {
  children: ReactNode;
}

export const BuilderLayout = ({ children }: BuilderLayoutProps) => {
  return (
    <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative">
        {children}
      </div>
    </div>
  );
};
