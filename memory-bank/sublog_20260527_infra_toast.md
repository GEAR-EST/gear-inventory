---
id: infra_toast_log
tipo: technical-sublog
data: 2026-05-27
tags: [native, toast, error-handling, capacitor]
---

# Log de Infraestrutura: Top Toast & Native Permissions

## O que foi feito?
1. **TopToast**: Um componente React customizado (`src/components/ui/TopToast.tsx`) foi criado para exibir notificações globais no topo da tela (Z-Index alto) usando `CustomEvent`.
2. **Injeção Global**: O componente `TopToastContainer` foi acoplado no `RootComponent` em `src/routes/__root.tsx` para garantir que funcione de forma agnóstica às rotas locais.
3. **Câmera Runtime (FAIL-FAST)**: O código de instanciação do `Html5QrcodeScanner` em `HomeTab.tsx` agora executa um `throw e` estrito caso não consiga acessar o hardware (permissão negada/falha de API web), ativando imediatamente um alerta de erro usando o novo componente visual.

## Restrições da Plataforma: iOS `Info.plist`
Não foi possível injetar a tag `NSCameraUsageDescription` pois o framework iOS via Capacitor (`ios/` folder) não foi inicializado neste repositório. Quando a plataforma for adicionada (`npx cap add ios`), a seguinte configuração deverá ser aplicada manualmente no `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Precisamos da sua câmera para ler QR Codes de movimentação e cadastro do inventário.</string>
```
