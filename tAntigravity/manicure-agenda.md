# Plano de Projeto: Aplicativo de Agenda para Manicure

> **Arquivo de Planejamento:** `manicure-agenda.md`  
> **Status:** APROVADO PELO USUÁRIO (Pronto para Implementação)  
> **Data de Atualização:** 2026-09-29  

---

## 1. Overview
Desenvolvimento de uma aplicação web **Mobile-First** para agendamento de serviços de manicure/nail designer. O sistema contará com:
- **Portal do Cliente:** Cadastro, login, visualização de calendário com datas e horários fixos vagos (09:00, 10:00, 11:00...), confirmação de agendamento e histórico completo de atendimentos.
- **Painel Administrativo da Manicure:** Visão geral da agenda diária/semanal, cancelamentos, bloqueio manual de datas/horários e controle de status dos atendimentos.
- **Nuvem em Tempo Real com Fallback Local:** Conexão com Supabase para sincronização em tempo real, com modo híbrido/demo local que permite uso imediato antes da configuração das credenciais.
- **Política de Cancelamento:** Cancelamento assistido via WhatsApp com aviso prévio direto para a profissional antes de desocupar o horário.

---

## 2. Project Type
- **Project Type:** `WEB` (Mobile-First Web App responsivo)
- **Primary Agent:** `frontend-specialist` (UI/UX e Telas) + `backend-specialist` / `database-architect` (Supabase e Modelagem)

---

## 3. Success Criteria
1. [ ] Interface mobile-first fluida, moderna e sem visual genérico (com design tokens documentados).
2. [ ] Calendário interativo permitindo navegação entre meses e seleção de datas disponíveis.
3. [ ] Grade de horários com slots fixos (ex: 09:00, 10:00, 11:00...) indicando claramente quais estão **vagos**, **ocupados** ou **bloqueados**.
4. [ ] Sistema de autenticação (cadastro/login) para clientes acompanharem seus agendamentos futuros e histórico de visitas.
5. [ ] Painel da manicure para visualização em formato de lista e calendário dos agendamentos, com controle de status (Pendente, Confirmado, Concluído, Cancelado).
6. [ ] Integração com Supabase (com modo de demonstração/fallback local ativo caso as credenciais da nuvem ainda não tenham sido configuradas).
7. [ ] Botão de envio rápido do agendamento para o WhatsApp da manicure para confirmação instantânea.

---

## 4. Tech Stack

| Componente | Tecnologia | Racional |
|------------|------------|----------|
| **Framework** | Next.js (App Router) / React + Vite + TypeScript | Performance veloz, componentização modular e fácil deploy |
| **Estilização** | CSS Moderno / Tailwind CSS v4 com tokens no `DESIGN.md` | Estética premium (tons rosê/nude/champagne elegantes, dark/light suave) |
| **Database & Auth** | Supabase (PostgreSQL + Auth + Realtime) | Armazenamento na nuvem seguro, autenticação nativa e sincronização |
| **Ícones & Datas** | `lucide-react` + `date-fns` | Manipulação precisa de datas e calendário sem bugs de fuso horário |

---

## 5. File Structure Prevista

```
manicure-agenda/
├── DESIGN.md                     # Tokens de design e identidade visual
├── supabase/
│   └── schema.sql                # DDL do banco (tabelas, RLS e triggers)
├── src/
│   ├── app/ (ou pages)
│   │   ├── layout.tsx            # Header com tema e navegação mobile
│   │   ├── page.tsx              # Página inicial / Boas-vindas e catálogo rápido
│   │   ├── agendar/page.tsx      # Fluxo de calendário, horários vagos e reserva
│   │   ├── historico/page.tsx    # Portal do cliente: visitas anteriores e próximas
│   │   ├── login/page.tsx        # Login / Cadastro de clientes e manicure
│   │   └── admin/page.tsx        # Painel da manicure (gestão da agenda e bloqueios)
│   ├── components/
│   │   ├── Calendar.tsx          # Calendário mensal/semanal
│   │   ├── TimeSlotGrid.tsx      # Grade de horários vagos e ocupados
│   │   ├── ServiceCard.tsx       # Seleção de serviços (Esmaltação, Gel, Spa, etc.)
│   │   ├── AppointmentModal.tsx  # Confirmação de agendamento
│   │   └── ui/                   # Botões, inputs, badges, cards
│   ├── lib/
│   │   ├── supabase.ts           # Cliente Supabase com fallback local
│   │   └── storage.ts            # Adaptador de persistência (Nuvem ou Local)
│   └── types/
│       └── index.ts              # Tipos TypeScript (Appointment, Service, User)
```

---

## 6. Task Breakdown

### TASK-001: Estrutura Base e Design System
- **Agent:** `frontend-specialist` | **Skill:** `frontend-design`
- **Prioridade:** P0
- **Input:** Requisitos de UI mobile-first e especificações de cores elegantes para manicure.
- **Output:** Projeto inicializado com `DESIGN.md` (tokens de cores, tipografia, espaçamento).
- **Verify:** Arquivo `DESIGN.md` criado e tokens CSS aplicados.

### TASK-002: Modelagem do Banco de Dados Supabase
- **Agent:** `database-architect` | **Skill:** `database-design`
- **Prioridade:** P0
- **Input:** Entidades necessárias: Clientes, Manicure, Serviços, Agendamentos e Horários Bloqueados.
- **Output:** Script `supabase/schema.sql` pronto para execução com políticas RLS (Row Level Security).
- **Verify:** Script SQL com tabelas `profiles`, `services`, `time_slots` e `appointments`.

### TASK-003: Camada de Conexão e Fallback Offline/Demo
- **Agent:** `backend-specialist` | **Skill:** `clean-code`
- **Prioridade:** P1
- **Input:** Necessidade de rodar imediatamente mesmo antes do usuário preencher as chaves de API do Supabase.
- **Output:** `src/lib/supabase.ts` que opera em nuvem se as chaves existirem, ou em modo Demo local persistente.
- **Verify:** O app funciona perfeitamente em modo de desenvolvimento local sem quebrar por falta de variáveis de ambiente.

### TASK-004: Componente de Calendário e Seleção de Data
- **Agent:** `frontend-specialist` | **Skill:** `frontend-design`
- **Prioridade:** P1
- **Input:** Biblioteca de datas e visualização do mês.
- **Output:** Componente `Calendar.tsx` com navegação de meses, desativação de dias passados e seleção de dia.
- **Verify:** Navegação de datas fluida em tela de smartphone (375px e 414px).

### TASK-005: Grade de Horários Vagos (TimeSlotGrid)
- **Agent:** `frontend-specialist` | **Skill:** `frontend-design`
- **Prioridade:** P1
- **Input:** Horários configurados (ex: 09:00 às 18:00 de hora em hora) cruzados com os agendamentos da data selecionada.
- **Output:** Componente `TimeSlotGrid.tsx` exibindo botões de horários com status visual (Livre, Ocupado, Selecionado).
- **Verify:** Horários já agendados aparecem desabilitados e visivelmente marcados.

### TASK-006: Portal do Cliente (Autenticação e Histórico de Visitas)
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Prioridade:** P2
- **Input:** Autenticação de clientes e listagem de histórico.
- **Output:** Telas de Login/Registro e página de Histórico com abas "Próximos" e "Passados".
- **Verify:** Cliente logado visualiza apenas seus próprios agendamentos e status.

### TASK-007: Painel Administrativo da Manicure
- **Agent:** `frontend-specialist` | **Skill:** `frontend-design`
- **Prioridade:** P2
- **Input:** Agendamentos de todas as clientes organizados por dia.
- **Output:** Painel com ações rápidas: Concluir atendimento, Cancelar, Bloquear horário (ex: almoço ou folga).
- **Verify:** A manicure pode bloquear um horário e este horário imediatamente fica indisponível para clientes.

### TASK-008: Ação de Confirmação e Integração WhatsApp
- **Agent:** `frontend-specialist` | **Skill:** `clean-code`
- **Prioridade:** P3
- **Input:** Dados do agendamento confirmado (data, horário, serviço, nome).
- **Output:** Gerador de link do WhatsApp com mensagem pronta formatada.
- **Verify:** Clique no botão abre o WhatsApp com o texto pré-preenchido.

---

## 7. Phase X: Checklist de Verificação Final
- [x] Interface responsiva desenvolvida para dispositivos móveis e desktop.
- [x] Nenhuma sobreposição de horários: slots ocupados ficam bloqueados na data selecionada.
- [x] Criação, leitura e cancelamento de agendamentos operando sem erros.
- [x] Fallback transparente: Modo Demonstração Local ativo com suporte a conexão direta ao Supabase.
- [x] Validação de design elegante, contraste de cores e tipografia (`Outfit` + `Inter`).
