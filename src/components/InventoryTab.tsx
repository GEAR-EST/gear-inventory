import { useEffect, useState } from "react";
import { MapPin, Package, X, QrCode, ClipboardList, Loader2, ArrowRight, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { usePermission } from "../hooks/usePermission";

interface Item {
  id: string;
  nome: string;
  estoque_base: number;
  estoque_atual: number;
}

interface Area {
  id: string;
  nome: string;
  qr_url: string | null;
  itens: Item[];
}

export function InventoryTab() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  useEffect(() => {
    fetchAreas(true);
  }, []);

  const fetchAreas = async (force = false) => {
    // Se não for forçado e já temos dados carregados há menos de 30 segundos, ignoramos a chamada
    if (!force && areas.length > 0 && Date.now() - lastFetchTime < 30000) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("areas")
        .select(
          `
          id,
          nome,
          qr_url,
          itens (
            id,
            nome,
            estoque_base,
            estoque_atual
          )
        `,
        )
        .order("nome");

      if (error) throw error;
      setAreas(data || []);
      setLastFetchTime(Date.now());
    } catch (err: any) {
      toast.error("Erro ao carregar inventário: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-brand" />
        <p className="text-sm text-muted-foreground font-medium">Carregando áreas...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-brand">Inventário</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-brand">Áreas e Locais</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {areas.length} áreas mapeadas. Selecione para ver componentes ou QR Code.
        </p>
      </header>

      {areas.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border rounded-2xl border-dashed p-6">
          <MapPin className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            Nenhuma área cadastrada no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 landscape:grid-cols-2 gap-3 space-y-0">
          {areas.map((area) => {
            const itemCount = area.itens?.length || 0;
            // Calculate critical items (estoque_atual < 50% of estoque_base)
            const criticalCount =
              area.itens?.filter(
                (it) => it.estoque_base > 0 && it.estoque_atual / it.estoque_base < 0.5,
              ).length || 0;

            return (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area)}
                className="w-full rounded-2xl border border-border bg-card p-4 text-left transition active:scale-[0.99] hover:border-cyan-brand/40 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-soft text-cyan-brand">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-navy-brand">{area.nome}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <Package className="h-3 w-3 text-cyan-brand" />
                      {itemCount} {itemCount === 1 ? "componente" : "componentes"}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {criticalCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-orange-soft px-2 py-0.5 text-[10px] font-bold text-orange-brand border border-orange-brand/20">
                        {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedArea && (
        <AreaDetailsModal
          area={selectedArea}
          onClose={() => {
            setSelectedArea(null);
            fetchAreas(); // refresh data in case things changed
          }}
        />
      )}
    </div>
  );
}

function AreaDetailsModal({ area, onClose }: { area: Area; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"qr" | "items">("qr");
  const [deletingArea, setDeletingArea] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const canDeleteArea = usePermission('deletar_area');
  const canDeleteItem = usePermission('deletar_item');

  const qrValue = area.qr_url || area.id;

  const handleDeleteArea = async () => {
    if (!confirm(`Deletar a área "${area.nome}" e todos os seus dados?`)) return;
    setDeletingArea(true);
    try {
      const { error } = await supabase.from('areas').delete().eq('id', area.id);
      if (error) throw error;
      toast.success(`Área "${area.nome}" deletada.`);
      onClose();
    } catch (err: any) {
      toast.error('Erro ao deletar área: ' + err.message);
    } finally {
      setDeletingArea(false);
    }
  };

  const handleDeleteItem = async (itemId: string, itemNome: string) => {
    if (!confirm(`Deletar o item "${itemNome}"?`)) return;
    setDeletingItemId(itemId);
    try {
      const { error } = await supabase.from('itens').delete().eq('id', itemId);
      if (error) throw error;
      toast.success(`Item "${itemNome}" deletado.`);
      onClose();
    } catch (err: any) {
      toast.error('Erro ao deletar item: ' + err.message);
    } finally {
      setDeletingItemId(null);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-brand/50 backdrop-blur-sm p-0 sm:items-center sm:p-5 landscape:items-center landscape:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl max-h-[85dvh] flex flex-col landscape:max-w-2xl landscape:rounded-3xl landscape:max-h-[90dvh]"
      >
        {/* HEADER: Centered title with Close button on the LEFT */}
        <div className="flex items-center justify-between border-b pb-3 mb-5">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-card p-2 text-navy-brand transition hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <h2 className="text-base font-bold text-navy-brand text-center flex-1 pr-8">
            {area.nome}
          </h2>
        </div>

        {/* TABS */}
        <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition ${activeTab === "qr"
              ? "bg-white text-navy-brand shadow-sm"
              : "text-slate-500 hover:text-navy-brand"
              }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Código QR
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition ${activeTab === "items"
              ? "bg-white text-navy-brand shadow-sm"
              : "text-slate-500 hover:text-navy-brand"
              }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Itens ({area.itens?.length || 0})
          </button>
        </div>

        {/* TAB CONTENT */}
        <div className="overflow-y-auto flex-1 pb-4">
          {activeTab === "qr" ? (
            <div className="flex flex-col landscape:flex-row items-center justify-center py-4 space-y-4 landscape:space-y-0 landscape:gap-6">
              <div className="rounded-2xl border-4 border-cyan-brand/20 bg-white p-3 shadow-lg shadow-cyan-brand/10 shrink-0">
                <QRCodeSVG
                  value={qrValue}
                  size={150}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#0b1f3a"
                  marginSize={0}
                />
              </div>
              <div className="text-center landscape:text-left max-w-[240px] landscape:max-w-xs">
                <p className="text-xs font-medium text-navy-brand/80 break-all">
                  Valor: <span className="font-mono text-cyan-brand">{qrValue}</span>
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Escaneie este código na aba Início para movimentar componentes neste local.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!area.itens || area.itens.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 border rounded-xl border-dashed">
                  <p className="text-xs text-muted-foreground font-medium">
                    Nenhum componente vinculado a esta área.
                  </p>
                </div>
              ) : (
                area.itens.map((item) => {
                  const ratio = item.estoque_base > 0 ? item.estoque_atual / item.estoque_base : 0;
                  const low = ratio < 0.5;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-xs font-bold text-navy-brand">
                            {item.nome}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Base: {item.estoque_base}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className={`text-sm font-extrabold ${low ? "text-orange-brand" : "text-navy-brand"}`}>
                              {item.estoque_atual}
                            </p>
                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                              atual
                            </p>
                          </div>
                          {canDeleteItem && (
                            <button
                              onClick={() => handleDeleteItem(item.id, item.nome)}
                              disabled={deletingItemId === item.id}
                              className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                              aria-label={`Deletar ${item.nome}`}
                            >
                              {deletingItemId === item.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ratio * 100)}%`,
                            background: low ? "var(--orange-brand)" : "var(--cyan-brand)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-cyan-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-brand/30 transition active:scale-[0.98] hover:brightness-105"
        >
          Fechar
        </button>

        {canDeleteArea && (
          <button
            onClick={handleDeleteArea}
            disabled={deletingArea}
            className="mt-2 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition active:scale-[0.98] hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deletingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Deletar Área
          </button>
        )}
      </div>
    </div>
  );
}
