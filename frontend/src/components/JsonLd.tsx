/**
 * JsonLd — injects JSON-LD structured data into the page.
 *
 * Usage:
 *   <JsonLd data={{ "@context": "https://schema.org", "@type": "Course", ... }} />
 *
 * Renders a <script type="application/ld+json"> tag. Safe for server components.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = Array.isArray(data)
    ? data.map((d) => JSON.stringify(d)).join("\n")
    : JSON.stringify(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
