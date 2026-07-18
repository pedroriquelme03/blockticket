// Seções do painel do cliente (tenant). Fonte única para a sidebar e para as
// páginas-esqueleto. `ready` indica o que já está implementado.

export interface AdminSection {
  key: string;
  label: string;
  icon: string;
  ready: boolean;
  description: string;
}

export const TENANT_SECTIONS: AdminSection[] = [
  {
    key: "inventario",
    label: "Inventário",
    icon: "📦",
    ready: true,
    description:
      "Produtos (ingressos, reservas, pacotes), tipos/variantes, tarifas por dia e disponibilidade.",
  },
  {
    key: "operacoes",
    label: "Operações",
    icon: "🎫",
    ready: true,
    description:
      "Pedidos, reservas do dia, check-in/validação de ingressos e agenda operacional.",
  },
  {
    key: "comercial",
    label: "Comercial",
    icon: "🏷️",
    ready: false,
    description:
      "Cupons de desconto, canais de venda, campanhas e ponto de venda (PDV).",
  },
  {
    key: "relatorios",
    label: "Relatórios",
    icon: "📊",
    ready: false,
    description: "Relatórios de vendas, ocupação, ticket médio e desempenho por período.",
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: "💰",
    ready: false,
    description:
      "Recebimentos, repasses (split), extratos e conciliação com o gateway.",
  },
  {
    key: "link",
    label: "Link de Vendas",
    icon: "🔗",
    ready: false,
    description:
      "Página/link de vendas compartilhável para redes e bio (equivalente ao Planne Link).",
  },
  {
    key: "parcerias",
    label: "Parcerias",
    icon: "🤝",
    ready: false,
    description: "Afiliados, agências e revendedores com comissão e link próprio.",
  },
  {
    key: "site",
    label: "Site",
    icon: "🌐",
    ready: true,
    description: "Domínios da loja (subdomínio do cliente) e personalização da vitrine.",
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: "⚙️",
    ready: false,
    description:
      "Dados do estabelecimento, usuários e permissões, gateway de pagamento e integrações.",
  },
  {
    key: "manual",
    label: "Manual de uso",
    icon: "📖",
    ready: false,
    description: "Guia passo a passo de como usar o sistema.",
  },
  {
    key: "suporte",
    label: "Suporte",
    icon: "💬",
    ready: false,
    description: "Canal de atendimento da FozDev.",
  },
];

export const PROFILE_SECTION: AdminSection = {
  key: "perfil",
  label: "Perfil",
  icon: "👤",
  ready: true,
  description: "Seus dados e sessão.",
};

export function getSection(key: string): AdminSection | undefined {
  return [...TENANT_SECTIONS, PROFILE_SECTION].find((s) => s.key === key);
}
