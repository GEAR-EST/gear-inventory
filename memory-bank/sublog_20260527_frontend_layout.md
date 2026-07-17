---
id: frontend_layout_log
tipo: technical-sublog
data: 2026-05-27
tags: [react, ui, refactor, layout-overflow]
---

# Log de Frontend: Ajuste de Layout e UX de Feedback

## O que foi feito?
1. **Refatoração do Seletor de Quantidade (`HomeTab.tsx`)**: O layout de flexão para os botões de controle de incremento/decremento (`+` e `-`) foi refatorado. 
   - A classe `items-stretch` sem limitação foi trocada por uma "bounding box" estrita: `mx-auto flex w-full max-w-[200px] overflow-hidden`.
   - Isso impede o vazamento de conteúdo (overflow) em telas mais estreitas, limitando a expansão infinita dos inputs numéricos sem quebrar a proporção do card.
2. **Desacoplamento de UI Library (Sonner)**: O sistema de envio de alertas (toast) do pacote Sonner foi integralmente substituído nas funções `handleCreate`, `handleQrScanSuccess` e `handleCommitTransaction` pela sub-rotina personalizada `showTopToast`.
   - Nenhuma lógica do estado React global foi violada. O uso da UI library antiga foi removido silenciosamente deste escopo, unificando a identidade visual das notificações efêmeras.
