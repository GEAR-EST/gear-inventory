import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  User,
  X,
  Search,
  Loader2,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface Perfil {
  nome: string;
}

interface Movimentacao {
  id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  data_hora: string;
  perfis: Perfil | null;
}

interface Area {
  id: string;
  nome: string;
}

interface ItemReport {
  id: string;
  nome: string;
  estoque_base: number;
  estoque_atual: number;
  criado_em: string;
  areas: Area | null;
  movimentacoes: Movimentacao[];
  wasCreatedInMonth: boolean;
}

export function ReportTab() {
  const getInitialMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const label = date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
      const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1);
      options.push({ value: `${year}-${month}`, label: formattedLabel });
    }
    return options;
  };

  const [selectedMonth, setSelectedMonth] = useState(getInitialMonth());
  const [items, setItems] = useState<ItemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ItemReport | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const monthOptions = getMonthOptions();

  useEffect(() => {
    fetchReportData(selectedMonth);
  }, [selectedMonth]);

  const fetchReportData = async (monthStr: string) => {
    setLoading(true);
    try {
      const [year, month] = monthStr.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      const { data, error } = await supabase
        .from("itens")
        .select(
          `
          id,
          nome,
          estoque_base,
          estoque_atual,
          criado_em,
          areas (
            id,
            nome
          ),
          movimentacoes (
            id,
            tipo,
            quantidade,
            data_hora,
            perfis (
              nome
            )
          )
        `,
        )
        .filter("movimentacoes.data_hora", "gte", startISO)
        .filter("movimentacoes.data_hora", "lt", endISO)
        .order("nome");

      if (error) throw error;

      const typedData = (data || [])
        .map((item: any) => {
          const areas = Array.isArray(item.areas) ? item.areas[0] : item.areas;
          const movimentacoes = (item.movimentacoes || []).map((m: any) => ({
            ...m,
            perfis: Array.isArray(m.perfis) ? m.perfis[0] : m.perfis,
          }));

          const createdAt = new Date(item.criado_em);
          const wasCreatedInMonth = createdAt >= startDate && createdAt < endDate;

          return {
            id: item.id,
            nome: item.nome,
            estoque_base: item.estoque_base,
            estoque_atual: item.estoque_atual,
            criado_em: item.criado_em,
            areas: areas || null,
            movimentacoes,
            wasCreatedInMonth,
          } as ItemReport;
        })
        .filter((item: ItemReport) => {
          const hasMovements = item.movimentacoes.length > 0;
          return hasMovements || item.wasCreatedInMonth;
        });

      setItems(typedData);
    } catch (err: any) {
      toast.error("Erro ao carregar relatório: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.areas?.nome.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalItems = items.length;
  const totalMovements = items.reduce((acc, item) => acc + item.movimentacoes.length, 0);
  const criticalItems = items.filter(
    (item) => item.estoque_base > 0 && item.estoque_atual / item.estoque_base < 0.5,
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-brand" />
        <p className="text-sm text-muted-foreground font-medium">Carregando relatórios...</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-28 pt-6">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-brand">
            Relatórios e Métricas
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy-brand">Histórico Mensal</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o fluxo de movimentações e o nível de estoque por período.
          </p>
        </div>
        <div className="w-full sm:w-48 shrink-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/10 transition shadow-sm"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm text-center">
          <p className="text-[10px] font-bold text-navy-brand/60 uppercase tracking-wider">Itens</p>
          <p className="text-lg font-black text-cyan-brand mt-1">{totalItems}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm text-center">
          <p className="text-[10px] font-bold text-navy-brand/60 uppercase tracking-wider">
            Movimentos
          </p>
          <p className="text-lg font-black text-navy-brand mt-1">{totalMovements}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm text-center">
          <p className="text-[10px] font-bold text-navy-brand/60 uppercase tracking-wider">
            Críticos
          </p>
          <p className="text-lg font-black text-orange-brand mt-1">{criticalItems}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por item ou local..."
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-xs text-navy-brand outline-none focus:border-cyan-brand focus:ring-2 focus:ring-cyan-brand/10 transition shadow-sm"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border rounded-2xl border-dashed p-6">
          <AlertCircle className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">Nenhum resultado encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="min-w-[640px] w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-slate-50/75 text-[10px] uppercase tracking-wider text-navy-brand/70">
                <th className="px-4 py-3 font-bold">Item</th>
                <th className="px-4 py-3 font-bold">Local</th>
                <th className="px-4 py-3 font-bold text-center">Base</th>
                <th className="px-4 py-3 font-bold text-center">Atual</th>
                <th className="px-4 py-3 font-bold text-center text-magenta-brand">Entradas</th>
                <th className="px-4 py-3 font-bold text-center text-orange-brand">Saídas</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const ins = item.movimentacoes
                  .filter((m) => m.tipo === "entrada")
                  .reduce((acc, m) => acc + m.quantidade, 0);
                const outs = item.movimentacoes
                  .filter((m) => m.tipo === "saida")
                  .reduce((acc, m) => acc + m.quantidade, 0);

                const finalIns = item.wasCreatedInMonth ? ins + item.estoque_base : ins;

                const ratio = item.estoque_base > 0 ? item.estoque_atual / item.estoque_base : 0;
                const isLow = ratio < 0.5;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer border-b border-border/60 transition last:border-b-0 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <td className="px-4 py-3.5 font-bold text-navy-brand">
                      <div className="flex items-center gap-2">
                        <span>{item.nome}</span>
                        {item.wasCreatedInMonth && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200 shrink-0">
                            Novo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-cyan-brand">
                      {item.areas?.nome || "Sem Área"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-navy-brand/80 font-medium">
                      {item.estoque_base}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-center font-black ${isLow ? "text-orange-brand" : "text-navy-brand"}`}
                    >
                      {item.estoque_atual}
                    </td>
                    <td className="px-4 py-3.5 text-center text-magenta-brand font-bold">
                      {finalIns > 0 ? `+${finalIns}` : "0"}
                    </td>
                    <td className="px-4 py-3.5 text-center text-orange-brand font-bold">
                      {outs > 0 ? `-${outs}` : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem && (
        <MovementsModal
          item={selectedItem}
          onClose={() => {
            setSelectedItem(null);
            fetchReportData(selectedMonth); // reload
          }}
        />
      )}
    </div>
  );
}

function MovementsModal({ item, onClose }: { item: ItemReport; onClose: () => void }) {
  // Sort movements newest first
  const sortedMovements = [...item.movimentacoes].sort(
    (a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime(),
  );

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
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border bg-card p-2 text-navy-brand transition hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <h2 className="text-base font-bold text-navy-brand text-center flex-1 pr-8">
            Histórico do Item
          </h2>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-navy-brand truncate">{item.nome}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Local:{" "}
            <span className="font-semibold text-cyan-brand">{item.areas?.nome || "Sem Área"}</span>{" "}
            · Estoque Atual: <span className="font-bold text-navy-brand">{item.estoque_atual}</span>{" "}
            / Base: {item.estoque_base}
          </p>
        </div>

        {/* TIMELINE */}
        <div className="overflow-y-auto flex-1 pb-4">
          {sortedMovements.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border rounded-xl border-dashed">
              <p className="text-xs text-muted-foreground font-medium">
                Nenhuma movimentação registrada.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {sortedMovements.map((m) => {
                const isIn = m.tipo === "entrada";
                const date = new Date(m.data_hora);

                return (
                  <li
                    key={m.id}
                    className="relative flex gap-3 rounded-xl border border-border bg-background p-3 shadow-sm"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white ${
                        isIn ? "bg-magenta-brand" : "bg-orange-brand"
                      }`}
                    >
                      {isIn ? (
                        <ArrowDownToLine className="h-4.5 w-4.5" />
                      ) : (
                        <ArrowUpFromLine className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black ${isIn ? "text-magenta-brand" : "text-orange-brand"}`}
                        >
                          {isIn ? "Entrada" : "Saída"} de {m.quantidade}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {date.toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {m.perfis?.nome || "Operador"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full rounded-xl bg-cyan-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-brand/30 transition active:scale-[0.98] hover:brightness-105"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
