import React from 'react';
import { ArrowLeft, ShieldCheck, Mail, MapPin } from 'lucide-react';

interface PrivacyPolicyViewProps {
  onNavigate: (view: string) => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[var(--seven-bg-primary)] text-[var(--seven-text-primary)] pb-20">
      {/* Header */}
      <div className="bg-[var(--seven-surface-card)] border-b border-[var(--seven-border-default)] sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="p-2 rounded-lg hover:bg-[var(--seven-surface-input)] transition-colors cursor-pointer"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <h1 className="text-lg font-black font-display tracking-tight">Política de Privacidade</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-sm leading-relaxed text-[var(--seven-text-secondary)]">
        <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-6 sm:p-8 shadow-xs space-y-6">
          <p className="text-xs text-[var(--seven-text-muted)]">Última atualização: Outubro de 2026</p>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">1. Finalidade dos Dados</h2>
            <p>
              Os dados pessoais coletados neste sistema são utilizados exclusivamente para:
              processamento de pedidos escolares, confirmação de pagamento, organização da produção,
              comunicação com o responsável sobre o status do pedido e controle de retirada/entrega.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">2. Dados Coletados</h2>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Nome do responsável</li>
              <li>Número de WhatsApp (para comunicação e confirmação)</li>
              <li>Nome do aluno e turma</li>
              <li>Tamanhos e personalizações das peças</li>
              <li>Dados de pagamento (método e status)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">3. Compartilhamento</h2>
            <p>
              Seus dados não são vendidos, alugados ou compartilhados com terceiros para fins comerciais.
              O compartilhamento ocorre apenas quando estritamente necessário para operação do serviço:
              provedor de pagamentos (Banco do Brasil / gateway Pix), provedor de mensagens transacionais
              (WhatsApp Business API) e equipe interna de produção/retirada da Seven Malharia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">4. Conservação</h2>
            <p>
              Os dados são mantidos pelo período necessário ao cumprimento do pedido e obrigações legais.
              Após a conclusão da campanha escolar e entrega de todos os pedidos, os dados poderão ser
              anonimizados ou excluídos, exceto quando houver obrigação legal de retenção.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">5. Seus Direitos</h2>
            <p>
              Conforme a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018), você tem direito a:
              confirmar a existência de tratamento, acessar seus dados, corrigir dados incompletos ou
              desatualizados, solicitar anonimização ou eliminação de dados desnecessários, e revogar
              consentimentos anteriormente concedidos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">6. Segurança</h2>
            <p>
              Utilizamos medidas técnicas adequadas para proteger seus dados, incluindo criptografia em
              trânsito (HTTPS), tokens seguros para consulta pública de pedidos e armazenamento server-side
              de credenciais sensíveis. Nenhum dado financeiro completo é armazenado localmente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-bold text-[var(--seven-text-primary)] font-display">7. Contato</h2>
            <p>Para exercer seus direitos ou esclarecer dúvidas sobre privacidade:</p>
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Av. Profª Cora de Carvalho, 2042-B, Centro – Macapá/AP</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                <span>WhatsApp: (96) 99160-5151</span>
              </div>
            </div>
          </section>
        </div>

        <div className="text-center pt-4">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à Loja
          </button>
        </div>
      </div>
    </div>
  );
};