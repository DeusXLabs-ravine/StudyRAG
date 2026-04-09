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
 * @param {string|string[]} [props.keywords] - Optional keyword targets
 * @param {string} [props.robots] - Optional robots directive
 * @param {Object|Object[]} [props.schema] - JSON-LD structured data object(s)
 */
export default function SEO({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage = '/logo-1.png',
  keywords,
  robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  schema,
}) {
  const siteName = 'StudyRAG';
  const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`;
  const baseUrl = 'https://studyrag.co';
  const url = canonical
    ? (canonical.startsWith('http') ? canonical : `${baseUrl}${canonical}`)
    : baseUrl;
  const resolvedOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;
  const keywordsContent = Array.isArray(keywords) ? keywords.join(', ') : keywords;
  const schemaBlocks = Array.isArray(schema) ? schema : (schema ? [schema] : []);

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywordsContent ? <meta name="keywords" content={keywordsContent} /> : null}
      <meta name="robots" content={robots} />
      <meta name="author" content={siteName} />
      <meta name="application-name" content={siteName} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:alt" content={`${siteName} preview image`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />
      <meta name="twitter:image:alt" content={`${siteName} preview image`} />

      {/* Structured Data (Schema.org) */}
      {schemaBlocks.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
