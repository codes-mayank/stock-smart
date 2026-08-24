import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  text?: string;
}

export function LoadingSpinner({ fullScreen = false, text = "Loading..." }: LoadingSpinnerProps) {
  const containerClasses = fullScreen
    ? "min-h-screen w-full flex flex-col items-center justify-center gap-4 text-muted-foreground"
    : "w-full flex flex-col items-center justify-center p-8 gap-4 text-muted-foreground";

  return (
    <div className={containerClasses}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {text && <p className="text-sm font-medium animate-pulse">{text}</p>}
    </div>
  );
}
