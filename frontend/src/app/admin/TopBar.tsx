"use client";
import React from "react";
import { Icon } from "./icons";
import { adminMenuData, type MenuItem, type MenuChild } from "./menuData";
import { useSiteSettings } from "./components/SiteSettingsContext";
import { apiFetch } from "@/lib/apiFetch";
import { API_BASE_URL } from "@/lib/config";

/* ──────────────────────────────────────────────────
   TopBar — Full Horizontal Navbar + Mobile Offcanvas
   ────────────────────────────────────────────────── */

interface TopBarProps {
  onNavigate: (href: string) => void;
  onLogout: () => void;
  activePath: string;
}

export default function TopBar({ onNavigate, onLogout, activePath }: TopBarProps) {
  const { siteSettings } = useSiteSettings();
  const [dueCount, setDueCount] = React.useState<number>(0);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    // Fetch due count when TopBar mounts or when activePath changes (in case they just viewed it)
    apiFetch(`${API_BASE_URL}/academic/purchases/overdue/count`)
      .then(res => res.ok ? res.json() : {count: 0})
      .then(data => setDueCount(data.count || 0))
      .catch(() => setDueCount(0));
  }, [activePath]);

  // Close mobile menu on path change
  React.useEffect(() => { setMobileOpen(false); }, [activePath]);

  // Lock body scroll when mobile menu open
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleExpand = (key: string) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Recursively process Level 3 nested items (like Syllabus children)
  const renderSubItem = (child: MenuChild) => {
    const hasNested = child.children && child.children.length > 0;

    if (child.uiConcept === "toggle") {
      return (
        <div
          key={child.label}
          className="tb-dropdown-item"
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div className="tb-dropdown-left">
            <Icon name={child.icon ?? "tool"} size={14} />
            {child.label}
          </div>
        </div>
      );
    }

    if (hasNested) {
      return (
        <div key={child.label} className="tb-dropdown-item">
          <div className="tb-dropdown-left">
            <Icon name={child.icon ?? "file-text"} size={14} />
            {child.label}
          </div>
          <Icon name="chevron-right" size={14} />

          {/* Level 3 flyout to the right */}
          <div className="tb-sub-dropdown">
            {child.children!.map(nested => (
              <div
                key={nested.href}
                className="tb-dropdown-item"
                onClick={() => onNavigate(nested.href)}
              >
                <div className="tb-dropdown-left" style={{ paddingLeft: 8 }}>
                  <div className="tb-dropdown-dot" style={{ opacity: 0.5 }} />
                  {nested.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div key={child.href} className="tb-dropdown-item" onClick={() => onNavigate(child.href)}>
        <div className="tb-dropdown-left">
          <Icon name={child.icon ?? "file-text"} size={14} />
          {child.label}
        </div>
        {child.label === "Due (Outstanding)" && dueCount > 0
          ? <span className="tb-badge" style={{background:"#ef4444"}}>{dueCount}</span>
          : child.badge && <span className="tb-badge">{child.badge}</span>}
      </div>
    );
  };

  const renderTopItem = (item: MenuItem) => {
    const isDashboard = item.href === "/admin";
    const hasChildren = item.type === "dropdown" && item.children && item.children.length > 0;
    const isActive = activePath.startsWith(item.href) && item.href !== "/admin";

    return (
      <div key={item.label} className={`tb-nav-item ${isActive ? "active" : ""}`} onClick={() => !hasChildren && onNavigate(item.href)}>
        <Icon name={item.icon} size={16} />
        {item.label}
        {item.label === "Fees / Payments" && dueCount > 0 && <span className="tb-badge-dot" style={{position:"absolute", top:10, right:10, width:8, height:8, background:"#ef4444", borderRadius:"50%"}} />}
        {item.badge && <span className="tb-badge" style={{ position: "absolute", top: 12, right: 6 }}>{item.badge}</span>}

        {hasChildren && (
          <span className="tb-nav-arrow"><Icon name="chevron-down" size={14} /></span>
        )}

        {hasChildren && (
          <div className="tb-dropdown">
            {item.children!.map(child => renderSubItem(child))}
          </div>
        )}
      </div>
    );
  };

  // ── Mobile sidebar recursive renderer ──
  const renderMobileChild = (child: MenuChild, depth = 0): React.ReactNode => {
    const key = `${child.label}-${child.href}`;
    const hasNested = child.children && child.children.length > 0;
    const isOpen = expanded[key];
    const isActive = child.href && activePath === child.href;

    return (
      <div key={key} className="mb-item-wrap">
        <div
          className={`mb-item ${isActive ? "active" : ""}`}
          style={{ paddingLeft: 16 + depth * 16 }}
          onClick={() => hasNested ? toggleExpand(key) : onNavigate(child.href)}
        >
          <div className="mb-item-left">
            <Icon name={child.icon ?? "file-text"} size={16} />
            <span>{child.label}</span>
          </div>
          {child.label === "Due (Outstanding)" && dueCount > 0 && (
            <span className="tb-badge" style={{ background: "#ef4444" }}>{dueCount}</span>
          )}
          {hasNested && (
            <span className={`mb-arrow ${isOpen ? "open" : ""}`}>
              <Icon name="chevron-down" size={14} />
            </span>
          )}
        </div>
        {hasNested && isOpen && (
          <div className="mb-nested">
            {child.children!.map(c => renderMobileChild(c, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderMobileItem = (item: MenuItem) => {
    const hasChildren = item.type === "dropdown" && item.children && item.children.length > 0;
    const key = `top-${item.label}`;
    const isOpen = expanded[key];
    const isActive = !hasChildren && activePath.startsWith(item.href) && item.href !== "/admin";

    if (!hasChildren) {
      return (
        <div
          key={key}
          className={`mb-item ${isActive ? "active" : ""}`}
          onClick={() => onNavigate(item.href)}
        >
          <div className="mb-item-left">
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </div>
        </div>
      );
    }

    return (
      <div key={key} className="mb-item-wrap">
        <div
          className={`mb-item ${isOpen ? "open" : ""}`}
          onClick={() => toggleExpand(key)}
        >
          <div className="mb-item-left">
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </div>
          <span className={`mb-arrow ${isOpen ? "open" : ""}`}>
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
        {isOpen && (
          <div className="mb-nested">
            {item.children!.map(c => renderMobileChild(c, 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="topbar" id="admin-topbar">
      {/* ── Brand (Left) ── */}
      <div className="tb-left">
        <div className="tb-icon-btn tb-mobile-toggle" onClick={() => setMobileOpen(true)}>
          <Icon name="menu" />
        </div>

        <div
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
          onClick={() => onNavigate("/admin")}
        >
          {(siteSettings.dark_logo_url || siteSettings.logo_url) ? (
            <img
              src={siteSettings.dark_logo_url || siteSettings.logo_url}
              alt={siteSettings.site_name || "IINM"}
              style={{ height: "40px", width: "40px", objectFit: "contain", borderRadius: "8px", background: "#1e293b" }}
            />
          ) : (
            <div className="tb-brand-icon">I</div>
          )}
        </div>
      </div>

      {/* ── Main Navigation (Horizontal) ── */}
      <div className="tb-nav">
        <div className="tb-nav-item" onClick={() => window.location.href = "/"}>
          <Icon name="globe" size={16} /> Home Page
        </div>
        <div className={`tb-nav-item ${activePath === "/admin" ? "active" : ""}`} onClick={() => onNavigate("/admin")}>
          <Icon name="home" size={16} /> Dashboard
        </div>
        {adminMenuData.map(renderTopItem)}
      </div>

      {/* ── Quick Tools ── */}
      <div className="tb-right">
        <div className="tb-icon-btn" title="Search">
          <Icon name="search" />
        </div>

        <div className="tb-icon-btn" title="Notifications">
          <Icon name="bell" />
          <span className="tb-badge-dot" />
        </div>

        <div className="tb-divider" />

        <div className="tb-profile">
          <div className="tb-avatar">A</div>
          <div>
            <div className="tb-profile-name">Super Admin</div>
            <div className="tb-profile-role">Manage System</div>
          </div>

          <div className="tb-dropdown" style={{ right: 0, left: "auto", minWidth: "160px" }}>
            <div className="tb-dropdown-item" onClick={onLogout} style={{ color: "#ef4444" }}>
              <div className="tb-dropdown-left">
                <Icon name="log-out" size={14} />
                Logout
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Offcanvas Sidebar ── */}
      {mobileOpen && (
        <div className="mb-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`mb-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="mb-header">
          <div className="mb-brand">
            {(siteSettings.dark_logo_url || siteSettings.logo_url) ? (
              <img
                src={siteSettings.dark_logo_url || siteSettings.logo_url}
                alt={siteSettings.site_name || "IINM"}
                style={{ height: "38px", width: "38px", objectFit: "contain", borderRadius: "6px", background: "#1e293b" }}
              />
            ) : (
              <div className="tb-brand-icon">I</div>
            )}
          </div>
          <div className="tb-icon-btn" onClick={() => setMobileOpen(false)}>
            <Icon name="x" />
          </div>
        </div>

        <div className="mb-search">
          <Icon name="search" size={16} />
          <input placeholder="Search menu…" />
        </div>

        <nav className="mb-nav">
          <div
            className={`mb-item ${activePath === "/admin" ? "active" : ""}`}
            onClick={() => onNavigate("/admin")}
          >
            <div className="mb-item-left">
              <Icon name="home" size={16} />
              <span>Dashboard</span>
            </div>
          </div>
          <div
            className="mb-item"
            onClick={() => { window.location.href = "/"; }}
          >
            <div className="mb-item-left">
              <Icon name="globe" size={16} />
              <span>Home Page</span>
            </div>
          </div>
          {adminMenuData.map(renderMobileItem)}
        </nav>

        <div className="mb-footer">
          <div className="mb-profile">
            <div className="tb-avatar">A</div>
            <div>
              <div className="tb-profile-name">Super Admin</div>
              <div className="tb-profile-role">Manage System</div>
            </div>
          </div>
          <div className="mb-logout" onClick={onLogout}>
            <Icon name="log-out" size={16} />
          </div>
        </div>
      </aside>
    </header>
  );
}
