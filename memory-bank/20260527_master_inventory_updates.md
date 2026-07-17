---
id: master_inventory_updates
tipo: ai-log
projeto: Inventory App
fase: MANUTENCAO_E_UX
data: 2026-05-27
status: aguardando_revisao
tags: [orchestration, native_permissions, ui_fix, toast_notifications]
descricao: "Orquestração da configuração de permissões de câmera, correção de overflow de layout e implementação de toast global."
---

### Resumo da Execução
As sub-rotinas foram concluídas de forma estritamente modular, mantendo a integridade do estado global e identidade visual originais.
1. O novo componente Top Toast está desacoplado e injetado via Root App.
2. A UX da interface de movimentação de itens (Quantidade) agora opera em bounding boxes protegidas de overflow mobile.
3. Permissão de câmera: Aplicado rigor nativo de FAIL-FAST. A recusa ou falha da inicialização na captura dispara erro instantâneo via Top Toast.

### Arquivos Modificados
#### Frontend
- `[NEW] src/components/ui/TopToast.tsx`: Componente de exibição assíncrona efêmera de mensagens.
- `[MODIFIED] src/routes/__root.tsx`: Injeção do `TopToastContainer`.
- `[MODIFIED] src/components/HomeTab.tsx`: Bounding boxes no seletor de quantidade (linhas 580+) e injeção do FAIL-FAST throw ao ler a câmera (linha ~90+). Desacoplamento da biblioteca `sonner` para a Top Toast global.

#### Infraestrutura
- `[MODIFIED] android/app/src/main/AndroidManifest.xml`: Validação de permissões da tag `<uses-permission android:name="android.permission.CAMERA" />`.
- `[NOTE] Info.plist`: Arquivo não criado fisicamente neste patch porque o workflow da pasta `ios/` não havia sido inicializado na árvore de projeto via Capacitor.

### Pontos de Atenção / Próximos Passos
- **Build Mobile Manual**: É necessário executar a recompilação da interface.
  - Para ambiente web local: `npm run dev` (Teste o Toast global pelo fluxo de `Saída` ou `Entrada`).
  - Para mobile: `npm run build:mobile` seguido de `npx cap sync android`.
- **Configuração iOS**: Se ou quando for habilitar para iOS (`npx cap add ios`), adicionar estritamente no `Info.plist` gerado: `<key>NSCameraUsageDescription</key><string>Precisamos da sua câmera para ler QR Codes de movimentação e cadastro do inventário.</string>`.
