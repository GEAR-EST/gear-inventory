---
tipo: documentacao_oficial
projeto: Inventory App
status: ativo
tags: [manual, arquitetura, ui, supabase, capacitor]
---

# Inventory App - Manual de Visão Geral e Guia do Usuário

Este documento apresenta a especificação arquitetural, identidade visual e o manual de operação do **Inventory App** (Projeto ALA), um sistema inteligente de gestão de inventário de laboratório otimizado para dispositivos móveis.

---

## 1. Visão Geral do Projeto & Features

O **Inventory App** foi concebido para resolver a rastreabilidade e controle de insumos e ferramentas dentro de ambientes de laboratório. Sua arquitetura integra tecnologias web modernas encapsuladas para execução nativa móvel, proporcionando rapidez e alta fidelidade operacional.

### Principais Funcionalidades (Features)
*   **Autenticação Google em Janela Nativa:** Login unificado via Google OAuth com Capacitor In-App Browser e Deep Linking (Custom URL Scheme), garantindo que o usuário retorne de forma transparente e segura ao app após o login.
*   **Geração Automática de QR Code via Nuvem/SVG:** Geração automática e leitura de códigos QR para identificação instantânea de locais, áreas e itens.
*   **Histórico de Movimentações em Tempo Real:** Registro detalhado de transações de entrada e saída por componente de forma auditável.
*   **Relatório Dinâmico Mensal:** Painel intuitivo que consolida entradas, saídas, itens críticos de estoque (abaixo de 50% da base) e destaca novos itens cadastrados no mês correspondente.

---

## 2. Identidade Visual (UI/UX)

O design visual do Inventory App foi projetado para ambientes de alta concentração e baixa iluminação (como laboratórios), combinando elementos estéticos premium baseados no ecossistema Samsung Ocean.

### Paleta de Cores e Temas
*   **Fundo e Base:** Tons escuros profundos (`#0A1128` / Navy Brand) que reduzem a fadiga ocular.
*   **Destaques Operacionais:**
    *   **Ciano/Cyan:** Utilizado para indicar locais, caminhos e status normais/interações principais.
    *   **Magenta:** Usado para representar entradas de estoque e fluxos de adição de saldo.
    *   **Laranja/Orange:** Usado para alertar sobre níveis críticos de estoque e fluxos de saída.

### Regras de Usabilidade
*   **Mobile-First & One-Handed Use:** Elementos de navegação e modais fixados na parte inferior da tela, botões grandes e de fácil alcance para controle utilizando apenas o polegar.
*   **Destaques Visuais no Relatório:**
    *   **Badge "Novo":** Identifica itens criados no período do mês selecionado, aplicando lógica visual automática sobre o estoque inicial.
    *   **Status Crítico:** Realce em cor laranja de alto contraste para itens cujo estoque atual esteja abaixo de 50% do estoque base.

---

## 3. Manual do Usuário (Passo a Passo)

### 3.1. Como Fazer Login
O aplicativo utiliza credenciais corporativas do Google.

1. Abra o aplicativo no seu dispositivo móvel.
2. Na tela de boas-vindas, toque no botão **"Entrar com o Google"**.
3. O aplicativo abrirá uma janela integrada e segura do navegador. Selecione ou digite sua conta Google.
4. Após a autorização, você será automaticamente redirecionado de volta para a tela inicial do aplicativo já autenticado.

![Fluxo de Login - Tela Inicial e Redirecionamento](./Docs/images/login_flow.png)

---

### 3.2. Como Cadastrar um Novo Item e Gerar o QR Code
Os itens são vinculados a áreas geográficas (laboratórios ou prateleiras).

1. Navegue até a aba **Inventário**.
2. Selecione a área desejada ou clique em adicionar nova área.
3. Insira o nome do item, a quantidade de **Estoque Base** (mínimo desejado) e a quantidade atual.
4. Ao salvar, o QR code é gerado dinamicamente no Supabase/Drive para ser impresso ou lido na área física.

![Cadastro de Item e Geração de QR Code](./Docs/images/register_item_qr.png)

---

### 3.3. Como Registrar Entrada/Saída de Estoque
Para ajustar as quantidades de um item após a utilização de insumos:

1. Acesse o item diretamente na lista de sua respectiva área ou faça a leitura do seu QR Code.
2. Na ficha do item, selecione **Registrar Movimentação**.
3. Escolha o tipo: **Entrada** (Magenta) ou **Saída** (Laranja).
4. Insira a quantidade movimentada e confirme. O estoque será recalculado em tempo real e a transação será logada no seu perfil.

![Registrar Movimentação - Entrada e Saída](./Docs/images/movement_modal.png)

---

### 3.4. Como Ler a Aba de Relatórios
A aba de relatórios consolida as métricas operacionais por período mensal.

1. Selecione a aba **Relatório** no menu inferior.
2. Use o seletor no topo superior direito para escolher o mês e ano desejados.
3. O painel exibirá:
    *   **Total de Itens:** Quantidade de itens que tiveram movimentações ou foram criados no período.
    *   **Movimentos:** Total de entradas/saídas ocorridas no mês selecionado.
    *   **Críticos:** Quantidade de itens na lista operando abaixo da margem segura de 50%.
4. Os itens com o badge **"Novo"** indicam que foram inseridos no sistema no respectivo mês, somando o estoque inicial às entradas para fins de conferência logística.

![Visualização de Métricas e Relatório Mensal](./Docs/images/reports_dashboard.png)
