import { useState } from "react";
import { Boxes, Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const redirectTo = Capacitor.isNativePlatform()
        ? "inventoryapp://login-callback"
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: Capacitor.isNativePlatform(),
        },
      });

      if (error) {
        toast.error(error.message || "Erro ao iniciar login com Google.");
        return;
      }

      if (Capacitor.isNativePlatform() && data?.url) {
        await Browser.open({ url: data.url, windowName: "_self" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-geo flex min-h-dvh flex-col items-center justify-center px-6 py-10 landscape:py-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-[0_20px_60px_-30px_rgba(20,40,90,0.35)] landscape:max-w-2xl landscape:p-6 landscape:grid landscape:grid-cols-2 landscape:gap-6 landscape:items-center">
        <div className="mb-8 flex flex-col items-center text-center landscape:mb-0 landscape:text-left landscape:items-start">
          <img src={logo} alt="GEAR logo" className="h-16 w-16 object-contain landscape:h-12 landscape:w-12" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-brand landscape:mt-2 landscape:text-xl">GEAR Inventário</h1>
          {/* <p className="mt-1 text-sm text-muted-foreground landscape:text-xs">Gestão de estoque para makers</p> */}
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-card/80 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-navy-brand/50" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {loading ? "Conectando..." : "Entrar com o Google"}
        </button>
      </div>
    </div>
  );
}
