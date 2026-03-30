import { Helmet } from 'react-helmet-async';

/**
 * Reusable SEO component for managing page metadata
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} [props.canonical] - Canonical URL
 * @param {string} [props.ogType] - Open Graph type (default: website)
 * @param {string} [props.ogImage] - Open Graph image URL
 * @param {Object} [props.schema] - JSON-LD structured data object
 */
export default function SEO({ 
  title, 
  description, 
  canonical, 
  ogType = 'website', 
  ogImage = '/logo-1.png',
  schema 
}) {
  const siteName = 'StudyRAG';
  const fullTitle = `${title} | ${siteName}`;
  const baseUrl = 'https://studyrag.co';
  const url = canonical ? `${baseUrl}${canonical}` : baseUrl;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data (Schema.org) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
