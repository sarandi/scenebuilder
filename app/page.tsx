"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { saveScene, updateScene, getScenes, getScene, deleteScene, reorderScenes } from "@/lib/api";
import type { SceneSummary } from "@/lib/api";
import { useRouter } from "next/navigation";
import { isAuthenticated, getToken, clearAuth } from "@/lib/auth";
import { mockEntities, entityColors, entityIcons, type EntityType } from "@/lib/mockData";
import { Editor } from "@/components/Editor";
import { Manifest } from "@/components/Manifest";
import type { Entity } from "@/lib/mockData";

const SWIPE_THRESHOLD = 50;
type PanelMode = "manifest" | "both" | "sidebar" | "none";

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>("manifest");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<EntityType | "all">("all");
  const [wordCount, setWordCount] = useState(0);
  const [linkedEntities, setLinkedEntities] = useState<Entity[]>([]);
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [sceneId, setSceneId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "idle">("idle");
  const [sceneTitle, setSceneTitle] = useState("");
  const sceneContentRef = useRef("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorResetRef = useRef<((content: string) => void) | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const manifestOpen = panelMode === "manifest" || panelMode === "both";
  const sidebarOpen = panelMode === "sidebar" || panelMode === "both";

  const cyclePanel = () => {
    setPanelMode(m =>
      m === "manifest" ? "both" :
      m === "both" ? "sidebar" :
      m === "sidebar" ? "none" : "manifest"
    );
  };

  const panelIcon =
    panelMode === "manifest" ? "☰" :
    panelMode === "both" ? "☰⊞" :
    panelMode === "sidebar" ? "⊞" : "⊟";

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setAuthChecked(true);
      loadScenes();
    }
  }, [router]);

  const loadScenes = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await getScenes(token);
      setScenes(data);
    } catch {
      console.error("Failed to load scenes");
    }
  };

  const handleSave = useCallback(async (title: string, content: string, id: number | null = sceneId): Promise<number | null> => {
    const token = getToken();
    if (!token || !title.trim()) return id;

    setSaveStatus("saving");
    try {
      if (id) {
        await updateScene(token, id, title, content);
        setSaveStatus("saved");
        setScenes(prev => prev.map(s => s.id === id ? { ...s, title, updatedAt: new Date().toISOString() } : s));
        return id;
      } else {
        const result = await saveScene(token, title, content);
        setSceneId(result.id);
        setSaveStatus("saved");
        setScenes(prev => [...prev, { id: result.id, title, displayOrder: result.displayOrder, createdAt: result.createdAt, updatedAt: result.updatedAt }]);
        return result.id;
      }
    } catch {
      setSaveStatus("unsaved");
      return id;
    }
  }, [sceneId]);

  const triggerAutoSave = useCallback((title: string, content: string) => {
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      handleSave(title, content);
    }, 2000);
  }, [handleSave]);

  const handleSceneSelect = async (scene: SceneSummary) => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    await handleSave(sceneTitle, sceneContentRef.current);
    const token = getToken();
    if (!token) return;
    try {
      const full = await getScene(token, scene.id);
      setSceneId(full.id);
      setSceneTitle(full.title);
      sceneContentRef.current = full.content;
      editorResetRef.current?.(full.content);
      setSaveStatus("saved");
    } catch {
      console.error("Failed to load scene");
    }
  };

  const handleSceneCreate = async () => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    await handleSave(sceneTitle, sceneContentRef.current);
    setSceneId(null);
    setSceneTitle("");
    sceneContentRef.current = "";
    editorResetRef.current?.("");
    setSaveStatus("idle");
  };

  const handleSceneDelete = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      await deleteScene(token, id);
      setScenes(prev => prev.filter(s => s.id !== id));
      if (sceneId === id) {
        setSceneId(null);
        setSceneTitle("");
        sceneContentRef.current = "";
        editorResetRef.current?.("");
        setSaveStatus("idle");
      }
    } catch {
      console.error("Failed to delete scene");
    }
  };

  const handleSceneRename = async (id: number, title: string) => {
    const token = getToken();
    if (!token) return;
    try {
      const content = id === sceneId ? sceneContentRef.current : "";
      await updateScene(token, id, title, content);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, title } : s));
      if (id === sceneId) setSceneTitle(title);
    } catch {
      console.error("Failed to rename scene");
    }
  };

  const handleScenesReorder = async (orderedIds: number[]) => {
    const token = getToken();
    if (!token) return;
    setScenes(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, displayOrder: i }));
    });
    try {
      await reorderScenes(token, orderedIds);
    } catch {
      console.error("Failed to reorder scenes");
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0) {
      setPanelMode(m => m === "sidebar" ? "none" : "manifest");
    } else {
      setPanelMode(m => m === "manifest" ? "none" : "sidebar");
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  const filtered = mockEntities.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || e.type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const entityTypes: (EntityType | "all")[] = ["all", "character", "location", "item", "faction", "event"];

  if (!authChecked) return null;

  return (
    <div
      className="main-layout"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {(manifestOpen || sidebarOpen) && (
        <div
          className="lg-hidden"
          onClick={() => setPanelMode("none")}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 15 }}
        />
      )}

      {/* Left — Manifest */}
      <div className={`drawer drawer-left ${manifestOpen ? "open" : "closed"}`}>
        <Manifest
          entities={linkedEntities}
          onClose={() => setPanelMode("none")}
          scenes={scenes}
          currentSceneId={sceneId}
          onSceneSelect={handleSceneSelect}
          onSceneCreate={handleSceneCreate}
          onSceneDelete={handleSceneDelete}
          onSceneRename={handleSceneRename}
          onScenesReorder={handleScenesReorder}
        />
      </div>

      {/* Center — Editor */}
      <div className="editor-column">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <button
            onClick={cyclePanel}
            style={{ background: "none", border: "none", color: panelMode !== "none" ? "var(--accent)" : "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, flexShrink: 0 }}
          >
            {panelIcon}
          </button>
          <input
            placeholder="Scene title..."
            value={sceneTitle}
            onChange={e => {
              setSceneTitle(e.target.value);
              triggerAutoSave(e.target.value, sceneContentRef.current);
            }}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--fg)", fontSize: "17px", fontFamily: "Georgia, serif", minWidth: 0 }}
          />
          <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", flexShrink: 0 }}>{wordCount}w</span>
          <span style={{
            fontSize: "11px",
            color: saveStatus === "saved" ? "var(--green)" : saveStatus === "saving" ? "var(--accent)" : saveStatus === "unsaved" ? "var(--red)" : "var(--fg-muted)",
            fontFamily: "monospace",
            flexShrink: 0
          }}>
            {saveStatus === "saved" ? "saved" : saveStatus === "saving" ? "saving..." : saveStatus === "unsaved" ? "unsaved" : ""}
          </span>
          <button
            onClick={() => handleSave(sceneTitle, sceneContentRef.current)}
            style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", flexShrink: 0, padding: "3px 8px", borderRadius: "4px" }}
          >
            save
          </button>
          <button
            onClick={() => { clearAuth(); window.location.href = "/login"; }}
            style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", flexShrink: 0 }}
          >
            signout
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "32px 24px" }}>
          <div style={{ maxWidth: "680px", margin: "0 auto", minHeight: "100%" }}>
            <Editor
              onWordCountChange={setWordCount}
              onEntitiesChange={setLinkedEntities}
              onContentChange={(content) => {
                sceneContentRef.current = content;
                triggerAutoSave(sceneTitle, content);
              }}
              onResetRef={editorResetRef}
            />
          </div>
        </div>
      </div>

      {/* Right — Entity Sidebar */}
      <div className={`drawer drawer-right ${sidebarOpen ? "open" : "closed"}`}>
        <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: "var(--fg-muted)", fontFamily: "monospace" }}>ENTITIES</span>
          <button onClick={() => setPanelMode("none")} style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entities..."
            style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", outline: "none", color: "var(--fg)", padding: "8px 12px", fontSize: "13px", borderRadius: "4px", fontFamily: "Georgia, serif" }}
          />
        </div>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              style={{
                background: activeFilter === type ? "var(--accent-dim)" : "var(--surface-2)",
                border: `1px solid ${activeFilter === type ? "var(--accent)" : "var(--border)"}`,
                color: activeFilter === type ? "var(--accent)" : "var(--fg-muted)",
                padding: "3px 10px", borderRadius: "20px",
                fontSize: "11px", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em",
              }}
            >
              {type}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filtered.map(entity => (
            <div
              key={entity.id}
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ color: entityColors[entity.type], fontSize: "12px" }}>{entityIcons[entity.type]}</span>
                <span style={{ color: "var(--fg)", fontSize: "14px" }}>{entity.name}</span>
              </div>
              <p style={{ color: "var(--fg-muted)", fontSize: "12px", lineHeight: 1.5, paddingLeft: "20px" }}>
                {entity.description.length > 80 ? entity.description.slice(0, 80) + "..." : entity.description}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No entities match.</p>
          )}
        </div>
      </div>

    </div>
  );
}