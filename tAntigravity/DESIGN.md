---
name: "NailStudio & Manicure Luxe"
version: "1.0.0"
colors:
  primary: "#D48B7B"          # Rose Terracotta elegante
  primary-hover: "#BF7262"
  primary-light: "#FDF5F3"
  secondary: "#3E2723"        # Espresso profundo (ótimo contraste)
  accent: "#D4AF37"           # Champagne Gold sutil
  background: "#FAF7F5"       # Warm Porcelain
  surface: "#FFFFFF"          # Branco puro para cards
  surface-muted: "#F5EFEB"    # Areia suave para áreas secundárias
  text-main: "#2D2424"        # Grafite terracota suave (nunca preto puro)
  text-muted: "#7A6E6D"       # Cinza quente informativo
  border: "#EADFD9"           # Borda delicada
  status-free: "#2E7D32"      # Verde sálvia/esmeralda para horários vagos
  status-busy: "#C62828"      # Tom suave para horário ocupado
  status-blocked: "#9E9E9E"   # Cinza para indisponível
typography:
  font-family-display: "'Outfit', 'Plus Jakarta Sans', sans-serif"
  font-family-body: "'Inter', sans-serif"
  size-title: "1.75rem"
  size-subtitle: "1.25rem"
  size-body: "0.95rem"
  size-small: "0.80rem"
elevation:
  card: "0 4px 20px -2px rgba(62, 39, 35, 0.06)"
  modal: "0 10px 30px -5px rgba(62, 39, 35, 0.15)"
rounded:
  sm: "6px"
  md: "12px"
  lg: "18px"
  full: "9999px"
---

# NailStudio & Manicure Luxe - Design System

## Overview
Identidade visual concebida para aplicativo de agendamento de manicure e estética de unhas. O objetivo visual é transmitir sofisticação, higiene, aconchego e clareza absoluta na leitura do calendário e seleção de horários vagos.

## Colors
- **Rose Terracotta (`#D48B7B`):** Cor de ação principal (botões, seleção de horários ativos, destaques do calendário).
- **Warm Porcelain (`#FAF7F5`):** Fundo suave que acolhe a visão e elimina o aspecto frio de telas brancas comuns.
- **Espresso Profundo (`#3E2723`):** Usado para títulos de alto impacto e sensação de marca premium.
- **Verde Esmeralda Sálvia (`#2E7D32`):** Indicador positivo de horário vago disponível para reserva imediata.

## Typography
- **Display & Headings:** `Outfit` — moderna, geométrica, com curvas acolhedoras que combinam com o nicho de beleza.
- **Body & UI Controls:** `Inter` — máxima legibilidade em botões, grades de horários e formulários.

## Layout & Mobile-First
- Projetado primeiramente para a visualização na palma da mão (375px - 430px), com navegação inferior rápida e botões confortáveis para o polegar (mínimo de 48px de área de clique).
- Layout expansivo e adaptativo para tablets e telas desktop, com visão em duas colunas (Calendário à esquerda, Grade de Horários à direita).

## Elevation & Depth
- Sombras suaves com tom difuso marrom/espresso, evitando o efeito de sombra preta artificial.
- Bordas finas com tom quente (`#EADFD9`) para delimitar slots de horários com nitidez.

## Components
- **Calendário Mensal:** Indicadores visuais claros para datas passadas (esmaecidas), hoje (borda sutil) e data selecionada (círculo com fundo terracotta).
- **Time Slot Pills:** Pílulas de horário clicáveis com estado vago ("09:00 - Livre"), ocupado ("10:00 - Ocupado") e selecionado.
- **Cards de Histórico:** Lista de visitas com data, serviço realizado, valor e status (Confirmado, Concluído, Em Andamento).

## Do's and Don'ts
- ✅ **DO:** Utilizar micro-transições suaves nos botões de horários ao clicar.
- ✅ **DO:** Destacar claramente o status da vaga (disponível vs indisponível).
- ❌ **DON'T:** Usar cores saturadas berrantes (como roxos neon ou vermelhos agressivos).
- ❌ **DON'T:** Sobrecarregar a tela com excesso de texto técnico de banco de dados.
