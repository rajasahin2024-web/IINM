"use client";
import Link from "next/link";
import JsonLd from "./JsonLd";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  baseUrl?: string;
}

/**
 * Breadcrumbs — visible breadcrumb nav + BreadcrumbList JSON-LD schema.
 *
 * Usage:
 *   <Breadcrumbs items={[{label:"Home",href:"/"},{label:"Courses",href:"/courses"},{label:"Course Title"}]} />
 */
export default function Breadcrumbs({ items, baseUrl = "https://iinmedu.com" }: BreadcrumbsProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.label,
      ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" style={{ padding: "12px 0", fontSize: 13 }}>
        <ol style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item, idx) => (
            <li key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {item.href && idx < items.length - 1 ? (
                <Link href={item.href} style={{ color: "#3b82f6", textDecoration: "none" }}>
                  {item.label}
                </Link>
              ) : (
                <span style={{ color: "#64748b" }}>{item.label}</span>
              )}
              {idx < items.length - 1 && <span style={{ color: "#cbd5e1" }}>/</span>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
