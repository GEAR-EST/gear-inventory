import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastEventDetail {
  message: string;
  type: ToastType;
}

export const showTopToast = (message: string, type: ToastType = "success") => {
  const event = new CustomEvent<ToastEventDetail>("show-top-toast", {
    detail: { message, type },
  });
  window.dispatchEvent(event);
};

export function TopToastContainer() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEventDetail>;
      setToast({ ...customEvent.detail, id: Date.now() });
      setTimeout(() => setToast(null), 3000); // Curta duração exigida
    };
    window.addEventListener("show-top-toast", handleToast);
    return () => window.removeEventListener("show-top-toast", handleToast);
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-5 duration-300">
      <div 
        className={`flex items-center gap-2 px-5 py-3.5 rounded-full shadow-xl border ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}
      >
        {toast.type === "success" ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0" />
        )}
        <span className="text-sm font-bold tracking-tight">{toast.message}</span>
      </div>
    </div>
  );
}
