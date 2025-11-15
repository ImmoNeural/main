import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}

const SEO = ({
  title = 'Guru do Dindin - Controle Financeiro Pessoal Inteligente',
  description = 'Organize suas finanças de forma simples e eficiente. Controle de gastos, orçamentos personalizados, análise de despesas e muito mais. Gratuito e fácil de usar!',
  keywords = 'controle financeiro, finanças pessoais, orçamento, planejamento financeiro, economia, gestão financeira, aplicativo financeiro, controlar gastos, dinheiro, investimentos',
  image = `${window.location.origin}/og-image.png`,
  url = window.location.href,
  type = 'website',
  noIndex = false,
}: SEOProps) => {
  const siteTitle = title.includes('Guru do Dindin') ? title : `${title} | Guru do Dindin`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {!noIndex && <meta name="robots" content="index,follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Guru do Dindin" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional SEO */}
      <meta name="author" content="Guru do Dindin" />
      <meta name="language" content="Portuguese" />
      <meta name="geo.region" content="BR" />
      <meta name="geo.placename" content="Brasil" />

      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  );
};

export default SEO;
