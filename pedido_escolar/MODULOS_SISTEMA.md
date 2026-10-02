# SEVEN PEDIDOS ESCOLARES
## Mapa Técnico dos Módulos do Sistema

**Data da Documentação:** 01 de Outubro de 2026  
**Stack Identificada:** React 19 (Vite), TailwindCSS v4, Supabase (PostgreSQL, Auth, Storage), jsPDF, lucide-react.  
**Objetivo:** Documentar detalhadamente todos os módulos, arquitetura, banco e regras de negócio existentes.  
**Aviso:** Este documento reflete rigorosamente o estado ATUAL do código-fonte e das migrations no momento de sua criação.

---

## VISÃO GERAL DA ARQUITETURA

O sistema opera de forma SPA (Single Page Application) e segue um modelo "Serverless" impulsionado por Supabase. 
- **Frontend:** Desenvolvido em React com Vite. Estilização robusta via TailwindCSS e componentes isolados.
- **Roteamento/Navegação:** Roteamento de estado customizado via `App.tsx` manipulando a variável `currentView` associada à History API do navegador (`pushState`), sem bibliotecas pesadas de roteamento.
- **Estado/Contextos:** Gerenciado via Context API do React (ex: `CartContext` e `AuthContext`).
- **Camada de Serviços:** Centralizada no arquivo `src/services/db.ts`, responsável por envelopar as chamadas ao Supabase.
- **Supabase:** Core de Backend-as-a-Service, provendo Banco de Dados (PostgreSQL), Autenticação, Storage para imagens e RPCs seguras (Functions).
- **Rigor de Segurança:** Baseado em Row Level Security (RLS) impenetrável por default e funções seguras de servidor (RPC) para transações complexas.
- **Áreas:** Dividido em Área Pública (Catálogo, Carrinho, Checkout, Consulta Pública) e Área Administrativa (Dashboard, Pedidos, Produção, etc).

### Fluxo Principal do Usuário
Splash Screen → Catálogo de Turmas → Seleção/Personalização → Carrinho de Compras → Checkout (Inclusão de Dados) → Criação Segura via RPC → Confirmação de Pedido (QR Code, PDF, Copia e Cola) → Retirada Futura via Consulta Pública.

---

## MÓDULOS PÚBLICOS E COMPONENTES

### Splash Screen
- **Finalidade:** Tela de abertura visual e carregamento inicial.
- **Arquivos:** `src/components/SplashScreen.tsx` e `src/index.css`.
- **Funcionamento / Animação:** Duração de ~6 segundos. Executa uma animação cinematográfica (`@keyframes splashCinematic`) criando profundidade (imagem que vem do fundo, ganha nitidez, aproxima-se e dissolve-se em efeito de névoa). O Splash desvanece a partir dos 4.3s, revelando o site sutilmente.
- **Relação com Catálogo:** O catálogo já está montado "por baixo" do Splash e ganha uma cascata animada controlada que entra perfeitamente na fase de dissipação da névoa.
- **Reduced Motion:** Aplica preferência do sistema operacional (`prefers-reduced-motion`), onde as animações são imediatamente curtas/concluídas (0.01ms).

### Header
- **Finalidade:** Barra de topo para identidade da marca e navegação.
- **Arquivo:** `src/components/Header.tsx`.
- **Funcionamento:** Provê navegação para Consulta de Pedido, Home e badge contador dinâmico ligado ao `CartContext`. É totalmente responsivo.

### Catálogo (CatalogView)
- **Finalidade:** Listagem das campanhas ativas, preços e turmas para compra.
- **Arquivo:** `src/views/CatalogView.tsx`.
- **Funcionamento:** Carrega turmas da campanha ativa através da API (`db.getClassesByCampaign`). Possui cards estilizados que utilizam a imagem real da turma (`classes.image_url`) ou um componente de camiseta vetorial construído em CSS puro.
- **Modal de Seleção:** Permite informar nome do aluno, tamanho da peça (via grade de preços de diferentes idades/tamanhos), quantidade e personalizações individuais (nome na estampa e número).
- **Entrada animada:** Possui uma animação de fade-up (de baixo para cima) em cascata limitada por um delay matemático (staggering), com fallback perfeito em ambientes reduced-motion.

### Carrinho (CartView e CartContext)
- **Finalidade:** Gerenciamento dos itens em memória e fluxo de checkout final.
- **Arquivos:** `src/views/CartView.tsx` e `src/context/CartContext.tsx`.
- **CartContext:** Provê o estado global local com itens, totais, e métodos de manipulação.
- **Carrinho - Visualização:** Lista completa, mostrando peças, quantidade, edição inline e preços.
- **Botão Esvaziar Carrinho:** Lixeira interativa com popover leve e seguro confirmando exclusão sem uso do `window.confirm`. Dispara o `clearCart()`. *Nota: "Esvaziar carrinho" atua somente no estado local anterior à criação do pedido e não cancela pedidos ou pagamentos na base de dados.*
- **Checkout:** Coleta de Nome do Responsável, Telefone (WhatsApp com máscara E164) e Opções de Pagamento (PIX, LOJA).
- **Criação do Pedido:** Envio seguro para o banco usando a função RPC (`rpc_create_order`), seguido da limpeza automática do carrinho e encaminhamento para Confirmação.

### Confirmação do Pedido
- **Finalidade:** Apresentação da conclusão da transação.
- **Arquivo:** `src/views/OrderConfirmationView.tsx`.
- **Funcionamento:** Recebe um `qr_token` e recupera os detalhes da compra de forma segura.
- **Recursos Exibidos:** Status do Pedido, QR Code em tela e Código PIX "Copia e Cola".
- **Geração de Comprovante (PDF):** Monta e baixa um PDF offline (usando jsPDF + Autotable) com informações do pagamento, dados do responsável e itens para apresentação e retirada na loja.
- **Compartilhamento:** Dispara URL de consulta diretamente via API do WhatsApp para praticidade.

### Consulta Pública
- **Finalidade:** Espaço seguro para o cliente final rastrear o andamento de suas roupas pós-compra.
- **Arquivo:** `src/views/OrderLookupView.tsx`.
- **Modos de Busca:** Por Número de Pedido, Nome do Responsável ou Telefone/WhatsApp (com higienização e máscara nativa).
- **Segurança:** Utiliza `lookup_token` e executa funções RPC exclusivas de busca estrita, protegendo a identificação sensível `qr_token`. Utiliza mascaramento de dados da resposta para privacidade.

### Footer
- **Finalidade:** Rodapé institucional global.
- **Arquivo:** `src/components/Footer.tsx`.
- **Funcionamento:** Possui links dinâmicos do Google Maps e direcionamento de WhatsApp genérico da loja.

---

## ÁREA ADMINISTRATIVA

### Login Administrativo
- **Arquivo:** `src/views/LoginView.tsx`.
- **Finalidade e Fluxo:** Utiliza Supabase Auth padrão. Realiza validação via RLS na tabela `admin_profiles`. Se ativo e credenciado, permite passagem ao Layout Admin.

### Admin Layout & Navegação
- **Arquivo:** `src/views/admin/AdminLayout.tsx`.
- **Finalidade:** Escudo de rotas e sidebar global do sistema de gestão, fornecendo navegação unificada às demais telas abaixo.

### Dashboard (AdminDashboardView)
- **Arquivo:** `src/views/admin/AdminDashboardView.tsx`.
- **Finalidade:** Visão geral administrativa com métricas gerais e acesso rápido às demais funções.

### Gestão de Catálogo e Campanhas (AdminCatalogManagementView)
- **Arquivo:** `src/views/admin/AdminCatalogManagementView.tsx`.
- **Finalidade:** Gerenciamento da vitrine pública. Manipula Campanhas ativas, Turmas, Categorias e Grade de Preços (`campaign_prices`).

### Monitoramento de Pedidos (AdminOrdersView)
- **Arquivo:** `src/views/admin/AdminOrdersView.tsx`.
- **Finalidade:** Visualização completa e paginação de pedidos de clientes reais. Controle das confirmações de pagamento.

### Scanner de Retirada (AdminQrScannerView)
- **Arquivo:** `src/views/admin/AdminQrScannerView.tsx`.
- **Finalidade:** Leitura através de câmera ou input textual do `qr_token` emitido no comprovante do cliente, visando validar e marcar entregas/retiradas de forma automatizada no balcão físico.

### Mapa de Produção (AdminProductionMapView)
- **Arquivo:** `src/views/admin/AdminProductionMapView.tsx`.
- **Finalidade:** Ferramenta dedicada a organizar e rastrear os estágios de produção (Pendente -> Produção -> Pronto).

### Relatórios e Exportação (AdminClassReportView)
- **Arquivo:** `src/views/admin/AdminClassReportView.tsx`.
- **Finalidade:** Geração de consolidados por Turmas, visando orientar as malharias na confecção (Quantitativos, Tamanhos, Estampas).

---

## AUTENTICAÇÃO E SESSÕES

A autenticação é garantida pelo Supabase Auth.
- **AuthContext:** Gerenciamento global local da sessão ativa (`src/context/AuthContext.tsx`).
- **Métodos Utilizados:** `signInWithPassword`, monitoramento nativo por `onAuthStateChange`, recuperação com `getSession` e saída com `signOut`.
- **Admin Profiles:** Após o Auth, a RLS valida automaticamente em requisições de banco se o UID do JWT possui permissão ativa cruzada na tabela `admin_profiles`. Somente usuários autorizados operam mutations de retaguarda.

---

## BANCO DE DADOS E TABELAS (Migrations)

O projeto usa PostgreSQL. Schema criado estritamente nas migrações SQL disponíveis no `supabase/migrations/`.

| Tabela | Finalidade | Relações Principais |
|---|---|---|
| `stores` | Cadastro da malharia (loja principal). | N/A |
| `schools` | Cadastro de colégios clientes. | `store_id` (N:1) |
| `campaigns` | Controle das aberturas e fechamentos de prazos. | `school_id` (N:1) |
| `classes` | Turmas específicas (ex: "5º Ano A"). | `campaign_id` (N:1) |
| `campaign_prices` | Grade de preços da campanha (Infantil/Adulto). | `campaign_id` (N:1) |
| `orders` | Cabeçalho global do pedido do cliente (Finalizado). | `campaign_id` (N:1) |
| `order_items` | Linhas detalhadas de roupas, atreladas a uma turma. | `order_id` (N:1), `class_id` (N:1) |
| `item_personalizations` | Personalizações explícitas de nome/número na peça. | `order_item_id` (N:1) |
| `payments` | Trilhas financeiras e referências de pagamentos PIX/Loja. | `order_id` (1:1) |
| `deliveries` | Trilha de retirada no balcão e observações. | `order_id` (1:1) |
| `order_status_events` | Timeline e auditoria contínua dos estágios do ciclo. | `order_id` (N:1) |
| `admin_profiles` | Lista branca (whitelist) e papéis da moderação. | (auth.users) |
| `whatsapp_outbox` | Fila/Queue off-line de mensagens de comunicação (Outbox). | `order_id` (N:1) |
| `public_order_lookup_tokens`| Tokens efêmeros criptográficos para consulta segura. | `order_id` (N:1) |

---

## SERVER-SIDE FUNCTIONS (RPCs)

A arquitetura move a carga lógica de validação para dentro do banco de dados visando evitar manipulações do front-end.

| RPC | Finalidade | Quem utiliza | Pública/Admin |
|---|---|---|---|
| `rpc_create_order` | Criação integral, cálculo de valores server-side e snapshot de preços, garantindo ordem à prova de fraudes. | Checkout (CartView) | Pública |
| `rpc_search_public_orders` | Busca protegida e parcial/mascarada de pedidos sem exigir acesso direto à tabela de pedidos. Retorna itens com `lookup_token`. | Consulta Pública | Pública |
| `rpc_get_public_order_details` | Visualização cega via `lookup_token` efêmero do pedido e seus itens. | Comprovante | Pública |
| `rpc_get_public_order_by_qr` | Visualização via `qr_token` do pedido e seus itens. | Comprovante direto | Pública |
| `rpc_lookup_order_by_credentials`| Busca detalhada manual usando chaves compostas (Nº Pedido + Nome Aluno + Nome Resp. + WhatsApp). | Consulta Pública | Pública |
| `rpc_confirm_payment` | Efetiva o status de pagamento e engatilha fluxo financeiro. | Admin | Admin |
| `rpc_confirm_delivery` | Marca pedido como entregue e registra no balcão. | Admin | Admin |

---

## RLS / SEGURANÇA E PROTEÇÃO

Todo acesso não autorizado à tabela (via papel `anon`) está bloqueado (Security Hardening).
- **Público (Read-Only):** Acesso concedido *somente à leitura* e exclusivamente onde `is_active = true` em `stores`, `schools`, `campaigns`, `classes`, e `campaign_prices`.
- **Escrita Pública:** Somente ocorre invólucro dentro da RPC `rpc_create_order` que roda como `SECURITY DEFINER`.
- **Privacidade do Pedido:** Clientes sem token específico estão impedidos de ver dados uns dos outros; os telefones aparecem mascarados e as chaves PIX não vazam via rede para clientes anônimos aleatórios.

---

## STORAGE (Buckets)

- **`class-images`**:
  - **Finalidade:** Armazena os designs/artes gráficas das camisetas importados pelo administrador.
  - **Permissões:** Leitura pública ampla habilitada (`Public select`).
  - **Upload, Update, Delete:** Restrito exclusivamente para administradores (`Authenticated admin uploads`).
  - **MIME Types e Limites:** Permite extensões nativas (JPG/JPEG, PNG, WEBP) sem confirmação estrita de tamanho nativo, porém validado no componente front-end `ClassImageUploader.tsx`. A URL gerada preenche a coluna `classes.image_url`.

---

## PAGAMENTOS E TRANSAÇÕES

### Atual
- **Métodos Implementados:** 
  - `PIX`: Emite códigos de recebimento padrão para finalização posterior.
  - `LOJA`: Finaliza com promessa de pagamento em balcão.
- **Provider atual (MockPixProvider):** Sistema opera emitindo tokens simulados e chaves aleatórias em mock provisório para validar usabilidade enquanto aguarda integração bancária real. O fluxo avança, preenche o PDF e salva em banco.

### Preparado/Futuro
- **Banco do Brasil (BancoDoBrasilPixProvider):** A arquitetura e o formulário preveem, mas INTEGRAÇÃO REAL DE SERVIÇO BANCO DO BRASIL AINDA NÃO FOI IMPLEMENTADA. O código aguarda inserção de chaves e endpoints oficiais reais para uso em Produção.

---

## STATUS DO PEDIDO

A timeline e auditoria rastreiam separadamente quatro colunas fundamentais mapeadas como ENUMS pelo banco:
- `order_status`: CONFIRMADO, CANCELADO.
- `payment_status`: NAO_PAGO, AGUARDANDO_PIX, PAGO, PIX_EXPIRADO.
- `production_status`: PENDENTE, EM_PRODUCAO, PRONTO.
- `delivery_status`: AGUARDANDO_RETIRADA, ENTREGUE.

---

## RESPONSIVIDADE E DESIGN SYSTEM

- Projeto mobile-first orientado primariamente à classes utilitárias do TailwindCSS.
- Variáveis customizadas (design tokens) registradas em `index.css` no prefixo `--seven-*` (Ex: `--seven-brand-hero`, `--seven-color-success`).
- Foco nativo em usabilidade `focus-visible`, scroll customizado e área de touch alvo mínima segura em telas portáteis. Animações de microinterações respeitam diretrizes operacionais de motion reduzido (`prefers-reduced-motion`).

---

## FUNCIONALIDADES VALIDADAS

- [x] Roteamento Inicial e App Navigation.
- [x] Splash Screen com profundidade visual (Preservando Reduced Motion).
- [x] Catálogo e Entrada em Cascata.
- [x] Modal de Configuração de Aluno com precificação combinada.
- [x] Carrinho Local, Alteração de Quantidade e Deleção Individual.
- [x] Esvaziar Carrinho com confirmação inline e transição de estado vazio seguro.
- [x] Formulário Final de Checkout com formatação E.164.
- [x] Confirmação de Pedido com geração realística nativa offline de Documento PDF (jsPDF).
- [x] Segurança Hardening das Entidades com Funções RPC exclusivas.
- [x] Autenticação e Autorização Supabase RLS real.
- [x] Storage e componente ClassImageUploader.
- [x] Áreas de Administração Completas.

---

## PENDÊNCIAS / BACKLOG (Conhecidas)

### Banco do Brasil (PIX Real)
Integração PIX real pendente. Endpoint bancário a ser acoplado.

### WhatsApp
Expansão da integração pendente. Tabela `whatsapp_outbox` já estruturada, necessitando engrenar Worker (webhook/função de disparo) de mensagens em momento futuro.

### Troca de Tamanho por Peça
Pós-lançamento. Operações atômicas de substituição (split de tabela de pedidos unificada) caso um cliente opte por receber metade numeração X e metade numeração Y antes da costura. 
**Nota técnica:** A tabela `order_items` atualmente totaliza `quantity` numa única coluna por `size_label`. A refatoração demandará RPC e split explícito para não quebrar rastreio e finanças.

### Browser E2E Real
Automação E2E pendente no Playwright não homologada de ponta a ponta nas suítes automatizadas, dependendo de testes manuais da interface humana atual.

---

## MAPA DE ARQUIVOS CHAVE

| Área | Arquivos | Responsabilidade |
|---|---|---|
| Serviços / API | `src/services/db.ts` | Ponte única de manipulação de dados client-side com Supabase e chamadas de RPCs. |
| Store Global | `src/context/CartContext.tsx` | Memória volátil e controle do pedido antes da efetivação final. |
| Navegação | `src/App.tsx` | Hub e roteamento SPA sem recarga. |
| Views Públicas | `src/views/CatalogView.tsx`, `CartView.tsx` | O core da jornada do consumidor, apresentando vitrine e finalização de negócio. |
| PDF | `src/views/OrderConfirmationView.tsx` | Rendering visual e lógica pesada de serialização para impressão jsPDF do recibo do pai de aluno. |
| Views Admin | `src/views/admin/*.tsx` | Todos os módulos e telas dedicadas aos gestores restritos. |
| Banco de Dados | `supabase/migrations/*.sql` | A infraestrutura completa de Backend, RLS, regras, queue local e funções de transação. |
| Global Styles | `src/index.css` | Animações customizadas, Design Tokens da agência e override de media queries. |
