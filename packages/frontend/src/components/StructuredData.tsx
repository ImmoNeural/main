import { Helmet } from 'react-helmet-async';

const StructuredData = () => {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Guru do Dindin',
    description: 'Plataforma de controle financeiro pessoal inteligente',
    url: 'https://gurudodindin.com.br',
    logo: 'https://gurudodindin.com.br/logo.png',
    sameAs: [
      // Adicione suas redes sociais aqui quando tiver
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      availableLanguage: ['Portuguese', 'pt-BR'],
    },
  };

  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Guru do Dindin',
    description: 'Controle financeiro pessoal inteligente e gratuito',
    url: 'https://gurudodindin.com.br',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'BRL',
    },
    featureList: [
      'Controle de gastos',
      'Orçamentos personalizados',
      'Análise de despesas',
      'Categorização automática',
      'Relatórios detalhados',
      'Sincronização em tempo real',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://gurudodindin.com.br',
      },
    ],
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'O Guru do Dindin é gratuito?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sim, o Guru do Dindin oferece planos gratuitos com recursos completos para controle financeiro pessoal.',
        },
      },
      {
        '@type': 'Question',
        name: 'Como funciona o controle de orçamento?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Você define limites de gastos por categoria e acompanha em tempo real quanto já gastou e quanto ainda tem disponível.',
        },
      },
      {
        '@type': 'Question',
        name: 'Meus dados estão seguros?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sim, utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança para proteger seus dados financeiros.',
        },
      },
    ],
  };

  const schemas = [organizationSchema, webApplicationSchema, breadcrumbSchema, faqSchema];

  return (
    <Helmet>
      {schemas.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default StructuredData;
