import { useEffect, useMemo, useState, useRef } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { usePermission } from "../hooks/usePermission";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  PackagePlus,
  ScanLine,
  X,
  Plus,
  Loader2,
  Camera,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { parseQrCodeString } from "../utils/qrParser";
import { Html5Qrcode } from "html5-qrcode";
import { showTopToast } from "./ui/TopToast";

type Mode = "entrada" | "saida" | "create" | null;
type CreateSubMode = "item" | "area";

function safeStopScanner(instance: Html5Qrcode): void {
  try {
    instance.stop().catch(() => {
      // Promise rejection de .stop() - scanner já parado. Seguro ignorar.
    });
  } catch {
    // Throw síncrono de .stop() - scanner não estava rodando. Seguro ignorar.
  }
}

export function HomeTab() {
  const { authUser } = useAuthContext();
  const canMovimentar = usePermission('movimentar_estoque');
  const canCadastrar = usePermission('cadastrar_item');

  const [mode, setMode] = useState<Mode>(null);
  const [createSubMode, setCreateSubMode] = useState<CreateSubMode>("item");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [base, setBase] = useState(0);
  const [selectedAreaId, setSelectedAreaId] = useState("");

  // Area form states
  const [areaName, setAreaName] = useState("");
  const [areaQrUrl, setAreaQrUrl] = useState("");

  // Scan workflow states
  const [scanStep, setScanStep] = useState<"scanning" | "selecting" | "completed">("scanning");
  const [manualCode, setManualCode] = useState("");
  const [scannedArea, setScannedArea] = useState<{ id: string; nome: string } | null>(null);
  const [areaItens, setAreaItens] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");

  // Data lists
  const [areas, setAreas] = useState<any[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanProcessedRef = useRef(false);

  // Fetch areas on load
  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const { data, error } = await supabase.from("areas").select("*").order("nome");
      if (error) throw error;
      setAreas(data || []);
      if (data && data.length > 0) {
        setSelectedAreaId(data[0].id);
      }
    } catch (err: any) {
      showTopToast("Erro ao buscar áreas: " + err.message, "error");
    }
  };

  // Camera integration
  useEffect(() => {
    if (mode && mode !== "create" && scanStep === "scanning") {
      let cancelled = false;
      let qrCodeInstance: Html5Qrcode | null = null;

      const initScanner = async () => {
        // Solicita permissão de câmera explicitamente antes de iniciar o scanner.
        // Isso dispara o diálogo nativo do SO (Android/iOS/Web).
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          // Libera o stream – o Html5Qrcode vai abrir o seu próprio.
          stream.getTracks().forEach((track) => track.stop());
        } catch (permissionError) {
          if (cancelled) return;
          showTopToast("Câmera bloqueada: verifique as permissões do aplicativo.", "error");
          return;
        }

        if (cancelled) return;

        // Delay curto para garantir que o container DOM já renderizou.
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (cancelled) return;

        try {
          const html5Qrcode = new Html5Qrcode("home-qr-reader");
          qrCodeInstance = html5Qrcode;
          scannerRef.current = html5Qrcode;

          scanProcessedRef.current = false;
          await html5Qrcode.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
            async (decodedText) => {
              if (scanProcessedRef.current) return;
              scanProcessedRef.current = true;
              safeStopScanner(html5Qrcode);
              try {
                await handleQrScanSuccess(decodedText);
              } catch (err) {
                console.error("Erro não tratado no scan:", err);
              }
            },
            () => {
              // Erros de loop de scan (frame vazio, etc.) ÔÇö silenciados intencionalmente.
            },
          );
        } catch (initError) {
          if (cancelled) return;
          showTopToast("Falha ao iniciar scanner de QR Code.", "error");
        }
      };

      initScanner();

      return () => {
        cancelled = true;
        const stopInstance = qrCodeInstance || scannerRef.current;
        if (stopInstance) {
          safeStopScanner(stopInstance);
        }
        qrCodeInstance = null;
        scannerRef.current = null;
      };
    }
  }, [mode, scanStep]);

  // Handle QR scanning success
  const handleQrScanSuccess = async (text: string) => {
    setLoading(true);
    try {
      const decoded = parseQrCodeString(text);
      const { data: area, error } = await supabase
        .from("areas")
        .select("*")
        .eq(decoded.searchField, decoded.value)
        .maybeSingle();

      if (error) throw error;

      if (!area) {
        showTopToast("Área/Localização não encontrada no banco.", "error");
        // Se for URL de Fase 1, sugere cadastrar
        if (decoded.searchField === "qr_url" && decoded.value.startsWith("http")) {
          showTopToast("Código externo detectado. Você pode cadastrar como nova área.", "success");
          setAreaQrUrl(decoded.value);
          setMode("create");
          setCreateSubMode("area");
        }
        return;
      }

      setScannedArea(area);
      // Fetch items in this area
      const { data: itens, error: itensError } = await supabase
        .from("itens")
        .select("*")
        .eq("area_id", area.id)
        .order("nome");

      if (itensError) throw itensError;

      setAreaItens(itens || []);
      if (itens && itens.length > 0) {
        setSelectedItemId(itens[0].id);
      }
      setScanStep("selecting");
    } catch (err: any) {
      showTopToast("Erro ao processar código: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQrScanSuccess(manualCode.trim());
  };

  // Commit transaction (Entrada / Saída)
  const handleCommitTransaction = async () => {
    if (!selectedItemId) {
      showTopToast("Selecione um item.", "error");
      return;
    }

    setLoading(true);
    try {
      if (!authUser) {
        showTopToast("Usuário não autenticado.", "error");
        return;
      }

      const { data: novoEstoque, error } = await supabase.rpc("registrar_movimentacao", {
        p_item_id: selectedItemId,
        p_tipo: mode,
        p_quantidade: qty,
        p_usuario_id: authUser.id,
      });

      if (error) throw error;

      showTopToast(`Movimentação registrada! Novo estoque: ${novoEstoque}`, "success");
      setMode(null);
      setScanStep("scanning");
      setScannedArea(null);
      setAreaItens([]);
      setQty(1);
    } catch (err: any) {
      showTopToast("Falha na movimentação: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Create area or item
  const handleCreate = async () => {
    setLoading(true);
    try {
      if (createSubMode === "area") {
        if (!areaName.trim()) {
          showTopToast("Preencha o nome da área.", "error");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("areas")
          .insert([{ nome: areaName, qr_url: areaQrUrl || null }])
          .select()
          .single();

        if (error) throw error;
        showTopToast(`Área "${data.nome}" criada com sucesso!`, "success");
        setAreaName("");
        setAreaQrUrl("");
        await fetchAreas();
        setMode(null);
      } else {
        if (!name.trim()) {
          showTopToast("Preencha o nome do item.", "error");
          setLoading(false);
          return;
        }
        if (!selectedAreaId) {
          showTopToast("Selecione uma área.", "error");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("itens")
          .insert([
            {
              nome: name,
              area_id: selectedAreaId,
              estoque_base: base,
              estoque_atual: base,
            },
          ])
          .select()
          .single();

        if (error) throw error;
        showTopToast(`Item "${data.nome}" cadastrado com sucesso!`, "success");
        setName("");
        setBase(0);
        setMode(null);
      }
    } catch (err: any) {
      showTopToast("Erro ao cadastrar: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="px-5 pb-6 pt-6">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-brand">
            Ações rápidas
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-brand">Movimentar estoque</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escaneie o QR Code do Local para movimentar itens ou cadastre novas áreas.
          </p>
        </header>

        <div className="grid grid-cols-1 landscape:grid-cols-3 gap-4">
          {canMovimentar && (
            <button
              onClick={() => {
                setMode("entrada");
                setScanStep("scanning");
                setQty(1);
              }}
              className="group relative overflow-hidden rounded-2xl border border-magenta-brand/20 bg-magenta-soft p-6 text-left transition active:scale-[0.98]"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-2xl bg-magenta-brand/20 rotate-12" />
              <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-xl bg-cyan-brand/20 -rotate-6" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-magenta-brand text-white shadow-lg shadow-magenta-brand/30">
                  <ArrowDownToLine className="h-6 w-6" />
                </div>
                <div className="mt-5">
                  <h2 className="text-xl font-bold text-navy-brand">Entrada</h2>
                  <p className="text-sm text-navy-brand/70">Adicionar itens ao estoque do local</p>
                </div>
              </div>
            </button>
          )}

          {canMovimentar && (
            <button
              onClick={() => {
                setMode("saida");
                setScanStep("scanning");
                setQty(1);
              }}
              className="group relative overflow-hidden rounded-2xl border border-orange-brand/20 bg-orange-soft p-6 text-left transition active:scale-[0.98]"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-2xl bg-orange-brand/25 rotate-12" />
              <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-xl bg-navy-brand/15 -rotate-6" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-brand text-white shadow-lg shadow-orange-brand/30">
                  <ArrowUpFromLine className="h-6 w-6" />
                </div>
                <div className="mt-5">
                  <h2 className="text-xl font-bold text-navy-brand">Saída</h2>
                  <p className="text-sm text-navy-brand/70">Retirar itens do estoque do local</p>
                </div>
              </div>
            </button>
          )}

          {canCadastrar && (
            <button
              onClick={() => {
                setMode("create");
                setCreateSubMode("item");
                setName("");
                setBase(0);
              }}
              className="group relative overflow-hidden rounded-2xl border border-cyan-brand/25 bg-cyan-soft p-6 text-left transition active:scale-[0.98]"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-2xl bg-cyan-brand/25 rotate-12" />
              <div className="absolute -right-2 -bottom-8 h-20 w-20 rounded-xl bg-navy-brand/15 -rotate-6" />
              <div className="relative">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-brand text-white shadow-lg shadow-cyan-brand/30">
                  <PackagePlus className="h-6 w-6" />
                </div>
                <div className="mt-5">
                  <h2 className="text-xl font-bold text-navy-brand">Cadastrar Novo Item/Área</h2>
                  <p className="text-sm text-navy-brand/70">
                    Criar novo componente ou local de estoque
                  </p>
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Create Mode (Area or Item Form)
  if (mode === "create") {
    return (
      <div className="px-5 pb-6 pt-6">
        <header className="mb-5 flex items-center justify-between border-b pb-3">
          {/* BOTÃO CANCELAR À ESQUERDA (Regra Global de Layout para Modais) */}
          <button
            onClick={() => setMode(null)}
            className="rounded-full border border-border bg-card p-2 text-navy-brand"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Título Centralizado */}
          <h1 className="text-lg font-bold text-navy-brand text-center flex-1 pr-8">
            {createSubMode === "item" ? "Cadastrar Novo Item" : "Cadastrar Nova Área"}
          </h1>
        </header>

        {/* SUB MODE TABS (Samsung Ocean Styled) */}
        <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setCreateSubMode("item")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${createSubMode === "item"
              ? "bg-white text-navy-brand shadow-sm"
              : "text-slate-500 hover:text-navy-brand"
              }`}
          >
            Item
          </button>
          <button
            onClick={() => setCreateSubMode("area")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${createSubMode === "area"
              ? "bg-white text-navy-brand shadow-sm"
              : "text-slate-500 hover:text-navy-brand"
              }`}
          >
            Área / Local
          </button>
        </div>

        {createSubMode === "item" ? (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="grid grid-cols-1 landscape:grid-cols-2 landscape:gap-4 space-y-4 landscape:space-y-0">
              <Field label="Nome do Item">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sensor Ultrassônico HC-SR04"
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                />
              </Field>

              <div className="grid grid-cols-1 landscape:grid-cols-2 landscape:gap-4 space-y-4 landscape:space-y-0">
                <Field label="Área / Localização">
                  <select
                    value={selectedAreaId}
                    onChange={(e) => setSelectedAreaId(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                  >
                    {areas.length === 0 ? (
                      <option value="">Nenhuma área cadastrada</option>
                    ) : (
                      areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))
                    )}
                  </select>
                </Field>

                <Field label="Estoque Inicial">
                  <input
                    type="number"
                    min={0}
                    value={base}
                    disabled={loading}
                    onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-bold text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                  />
                </Field>
              </div>
            </div>

            <button
              disabled={loading || !name.trim() || !selectedAreaId}
              onClick={handleCreate}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-brand px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-brand/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar no Inventário
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="grid grid-cols-1 landscape:grid-cols-2 landscape:gap-4 space-y-4 landscape:space-y-0">
              <Field label="Nome da Área (Ex: Armário A, Gaveta 3)">
                <input
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="Ex: Prateleira B1"
                  disabled={loading}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                />
              </Field>

              <Field label="Identificador QR / URL do Local (Opcional)">
                <div className="flex gap-2">
                  <input
                    value={areaQrUrl}
                    onChange={(e) => setAreaQrUrl(e.target.value)}
                    placeholder="Ex: AREA-A1 ou URL me-qr.com"
                    disabled={loading}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                  />
                </div>
              </Field>
            </div>

            <button
              disabled={loading || !areaName.trim()}
              onClick={handleCreate}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-brand px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-brand/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Salvar Área
            </button>
          </div>
        )}
      </div>
    );
  }

  const isIn = mode === "entrada";
  const accentColor = isIn ? "magenta-brand" : "orange-brand";

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="mb-5 flex items-center justify-between border-b pb-3">
        {/* BOTÃO CANCELAR À ESQUERDA */}
        <button
          onClick={() => {
            setMode(null);
            setScanStep("scanning");
            setScannedArea(null);
            setAreaItens([]);
          }}
          className="rounded-full border border-border bg-card p-2 text-navy-brand"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Título Centralizado */}
        <h1 className="text-lg font-bold text-navy-brand text-center flex-1 pr-8">
          {isIn ? "Entrada de Estoque" : "Saída de Estoque"}
        </h1>
      </header>

      {scanStep === "scanning" && (
        <div className="flex flex-col landscape:flex-row landscape:gap-6 landscape:items-center">
          <div className="w-full landscape:w-1/2 landscape:max-w-xs shrink-0">
            <div className="scanner-frame aspect-square w-full bg-slate-900 rounded-2xl overflow-hidden relative border-2 border-dashed border-cyan-brand/50">
              <div id="home-qr-reader" className="w-full h-full object-cover"></div>
              {loading && (
                <div className="absolute inset-0 bg-navy-brand/40 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 w-full space-y-4 mt-4 landscape:mt-0">
            <div className="text-center bg-slate-50 border p-3 rounded-xl">
              <p className="text-xs font-semibold text-navy-brand/80">
                Escaneie o QR Code fixado no Local
              </p>
            </div>

            {/* FALLBACK MANUAL PARA TESTES/DEPURAÇÃO */}
            <form onSubmit={handleManualCodeSubmit} className="flex gap-2">
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Digite o código da área manualmente..."
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-xs text-navy-brand outline-none focus:border-cyan-brand focus:ring-1 focus:ring-cyan-brand/30"
              />
              <button
                type="submit"
                className="bg-navy-brand text-white px-4 py-2.5 rounded-xl text-xs font-semibold shrink-0"
              >
                Buscar
              </button>
            </form>
          </div>
        </div>
      )}

      {scanStep === "selecting" && scannedArea && (
        <div className="mt-2 rounded-2xl border border-border bg-card p-5 shadow-sm grid grid-cols-1 landscape:grid-cols-2 gap-4 landscape:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Local Localizado
            </p>
            <h2 className="text-xl font-bold text-navy-brand">{scannedArea.nome}</h2>

            {areaItens.length === 0 && (
              <div className="text-center py-4 bg-slate-50 rounded-xl border mt-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Este local não possui componentes cadastrados.
                </p>
                <button
                  onClick={() => {
                    setSelectedAreaId(scannedArea.id);
                    setMode("create");
                    setCreateSubMode("item");
                  }}
                  className="inline-flex items-center gap-1.5 bg-cyan-brand text-white text-xs font-semibold px-4 py-2 rounded-xl shadow"
                >
                  <Plus className="h-3 w-3" />
                  Cadastrar Item Aqui
                </button>
              </div>
            )}
          </div>

          {areaItens.length > 0 && (
            <div className="space-y-4">
              <Field label="Selecione o Componente">
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                >
                  {areaItens.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome} (Atual: {item.estoque_atual})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Quantidade">
                <div className="mx-auto flex w-full max-w-[200px] items-stretch gap-2 overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-12 shrink-0 bg-slate-50/50 text-lg font-bold text-navy-brand transition hover:bg-slate-100 active:bg-slate-200"
                  >
                    ÔêÆ
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="min-w-0 flex-1 border-x border-border bg-transparent px-2 py-3 text-center text-lg font-bold text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/30"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="w-12 shrink-0 bg-slate-50/50 text-lg font-bold text-navy-brand transition hover:bg-slate-100 active:bg-slate-200"
                  >
                    +
                  </button>
                </div>
              </Field>

              <button
                onClick={handleCommitTransaction}
                disabled={loading}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98]"
                style={{
                  backgroundColor: isIn ? "var(--magenta-brand)" : "var(--orange-brand)",
                  boxShadow: `0 10px 15px -3px rgba(${isIn ? "226, 0, 116" : "255, 106, 0"}, 0.3)`,
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirmar {isIn ? "entrada" : "saída"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-navy-brand/70">
        {label}
      </label>
      {children}
    </div>
  );
}
