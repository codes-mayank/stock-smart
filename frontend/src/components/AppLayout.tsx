import { TopNavbar } from "@/components/TopNavbar";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex flex-col w-full relative overflow-x-hidden">
      <TopNavbar />
      <main 
        key={location.pathname}
        className="flex-1 w-full flex flex-col items-center"
      >
        <div className="w-full max-w-[1400px] px-4 md:px-6 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
