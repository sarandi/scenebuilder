"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect, Suspense } from "react";

const TABS = [
  { key: "worlds",   label: "My Worlds" },
  { key: "social",   label: "Social" },
  { key: "others",   label: "Others'" },
] as const;

export type Corner = "top-right" | "top-left" | "bottom-right" | "bottom-left";

const menuItemStyle: React.CSSProperties = {
  background: "none", border: "none", color: "var(--fg-muted)",
  cursor: "pointer", fontSize: "12px", fontFamily: "monospace",
  padding: "6px 14px", textAlign: "left", display: "block", width: "100%",
};

function cornerPositionStyle(corner: Corner): React.CSSProperties {
  const base: React.CSSProperties = { position: "fixed", zIndex: 200 };
  switch (corner) {
    case "top-right":    return { ...base, top: 0, right: 0,    borderBottomLeftRadius: "6px", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)" };
    case "top-left":     return { ...base, top: 0, left: 0,     borderBottomRightRadius: "6px", borderBottom: "1px solid var(--border)", borderRight: "1px solid var(--border)" };
    case "bottom-right": return { ...base, bottom: 0, right: 0, borderTopLeftRadius: "6px",    borderTop: "1px solid var(--border)",    borderLeft: "1px solid var(--border)" };
    case "bottom-left":  return { ...base, bottom: 0, left: 0,  borderTopRightRadius: "6px",   borderTop: "1px solid var(--border)",    borderRight: "1px solid var(--border)" };
  }
}

function snapCorner(x: number, y: number): Corner {
  const midX = window.innerWidth / 2;
  const midY = window.innerHeight / 2;
  if (x >= midX && y <  midY) return "top-right";
  if (x <  midX && y <  midY) return "top-left";
  if (x >= midX && y >= midY) return "bottom-right";
  return "bottom-left";
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
}

function NavTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") ?? "worlds";
  const onHome = pathname === "/";

  return (
    <div style={{ display: "flex", flex: 1 }}>
      {TABS.map(t => {
        const active = onHome && currentTab === t.key;
        return (
          <Link key={t.key} href={`/?tab=${t.key}`} style={{
            padding: "12px 14px", fontSize: "13px", fontFamily: "monospace",
            color: active ? "var(--accent)" : "var(--fg-muted)",
            borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
            letterSpacing: "0.06em", textDecoration: "none", flexShrink: 0, display: "inline-block",
          }}>{t.label}</Link>
        );
      })}
    </div>
  );
}

export function AppNav({ initialCollapsed, initialCorner }: { initialCollapsed: boolean; initialCorner: Corner }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [corner, setCorner] = useState<Corner>(initialCorner);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPinned, setMenuPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, elemX: 0, elemY: 0 });
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = document.documentElement.style;
    s.removeProperty("--nav-safe-left");
    s.removeProperty("--nav-safe-right");
    if (collapsed && !corner.startsWith("bottom")) {
      s.setProperty(corner.endsWith("left") ? "--nav-safe-left" : "--nav-safe-right", "110px");
    }
  }, [corner, collapsed]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("nav-collapsed", String(next));
    setCookie("nav-collapsed", String(next));
  };

  const menuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => { if (menuTimer.current) { clearTimeout(menuTimer.current); menuTimer.current = null; } };
  const openMenu = () => { clearTimer(); setMenuOpen(true); };
  const scheduleClose = () => { if (menuPinned) return; clearTimer(); menuTimer.current = setTimeout(() => setMenuOpen(false), 300); };
  const togglePin = () => {
    if (menuPinned) {
      setMenuPinned(false);
      clearTimer();
      menuTimer.current = setTimeout(() => setMenuOpen(false), 300);
    } else {
      setMenuPinned(true);
      openMenu();
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    e.preventDefault();
    const rect = tabRef.current!.getBoundingClientRect();
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, elemX: rect.left, elemY: rect.top };
    setDragPos({ x: rect.left, y: rect.top });
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOrigin.current.mouseX;
      const dy = e.clientY - dragOrigin.current.mouseY;
      setDragPos({ x: dragOrigin.current.elemX + dx, y: dragOrigin.current.elemY + dy });
    };
    const onUp = (e: MouseEvent) => {
      setDragging(false);
      setDragPos(null);
      const next = snapCorner(e.clientX, e.clientY);
      setCorner(next);
      localStorage.setItem("nav-corner", next);
      setCookie("nav-corner", next);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const isBottom = corner.startsWith("bottom");

  const menuItems = (
    <div onMouseEnter={openMenu} onMouseLeave={scheduleClose} style={{ maxHeight: menuOpen ? "200px" : "0", overflow: "hidden", transition: "max-height 0.2s ease" }}>
      <div style={{ borderTop: isBottom ? "none" : "1px solid var(--border)", borderBottom: isBottom ? "1px solid var(--border)" : "none", padding: "4px 0" }}>
        {[
          { label: "account",  href: "/?tab=account" },
          { label: "settings", href: "/?tab=settings" },
          ...(isAdmin ? [{ label: "admin", href: "/admin" }] : []),
        ].map(({ label, href }) => (
          <Link key={label} href={href}
            style={{ ...menuItemStyle, display: "block", textDecoration: "none" }}
            onClick={() => { setMenuOpen(false); setMenuPinned(false); }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >{label}</Link>
        ))}
        <button style={menuItemStyle}
          onClick={() => signOut(() => { window.location.href = "/sign-in"; })}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >sign out</button>
      </div>
    </div>
  );

  const pillRow = (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", padding: "2px 4px" }}>
      <span style={{ color: "var(--border)", fontSize: "12px", padding: "0 4px", cursor: "inherit" }}>⠿</span>
      <button
        onClick={togglePin}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        style={{ background: "none", border: "none", color: menuOpen ? "var(--fg)" : "var(--fg-muted)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "3px 5px" }}
      >•••</button>
      <button
        onClick={toggle}
        title={collapsed ? "Expand navigation" : "Collapse navigation"}
        style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", padding: "3px 5px" }}
      >{collapsed ? "▼" : "▲"}</button>
    </div>
  );

  const tabStyle: React.CSSProperties = dragging && dragPos
    ? { position: "fixed", top: dragPos.y, left: dragPos.x, zIndex: 200, cursor: "grabbing", opacity: 0.85 }
    : cornerPositionStyle(corner);

  const tab = (
    <div
      ref={tabRef}
      onMouseDown={handleDragStart}
      style={{ ...tabStyle, display: "flex", flexDirection: "column", background: "var(--surface)", cursor: dragging ? "grabbing" : "grab", userSelect: "none", overflow: "hidden" }}
    >
      {!isBottom && pillRow}
      {menuItems}
      {isBottom && pillRow}
    </div>
  );

  if (collapsed) {
    return (
      <div style={{ flexShrink: 0, height: 0, overflow: "visible" }}>
        {tab}
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", paddingTop: 0, paddingBottom: 0, paddingLeft: corner === "top-left" ? "100px" : "8px", paddingRight: corner === "top-right" ? "100px" : "8px", transition: "padding 0.25s ease" }}>
      <Link href="/" style={{ color: "var(--accent)", fontSize: "11px", fontFamily: "monospace", textDecoration: "none", fontWeight: "bold", letterSpacing: "0.1em", padding: "0 8px", flexShrink: 0 }}>SB</Link>
      <Suspense fallback={
        <div style={{ display: "flex", flex: 1 }}>
          {TABS.map(t => (
            <span key={t.key} style={{ padding: "12px 14px", fontSize: "13px", fontFamily: "monospace", color: "var(--fg-muted)", borderBottom: "2px solid transparent", letterSpacing: "0.06em", flexShrink: 0, display: "inline-block" }}>{t.label}</span>
          ))}
        </div>
      }>
        <NavTabs />
      </Suspense>
      {tab}
    </div>
  );
}
