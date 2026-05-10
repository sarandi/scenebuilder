"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { saveScene, updateScene, updateStory, getScenes, getScene, deleteScene, reorderScenes, getStory, getUniverses, getEntities, getEntityTypes, createEntity, toEditorEntity, type EditorEntity, type EntityType, type Universe } from "@/lib/api";
import type { SceneSummary } from "@/lib/api";
import { useAuth, useClerk } from "@clerk/nextjs";
import { Editor } from "@/components/Editor";
import { Manifest } from "@/components/Manifest";
import { EntityEditModal } from "@/components/EntityEditModal";
import { EntityViewModal } from "@/components/EntityViewModal";
import { EntityActionButtons } from "@/components/EntityActionButtons";
import { useParams } from "next/navigation";

const SWIPE_THRESHOLD = 50;
type PanelMode = "manifest" | "both" | "sidebar" | "none";

export default function StoryEditor() {
  const params = useParams();
  const storyId = Number(params.id);

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { signOut } = useClerk();

  const [panelMode, setPanelMode] = useState<PanelMode>("manifest");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [modalEntityId, setModalEntityId] = useState<number | null>(null);
  const [viewEntityId, setViewEntityId] = useState<number | null>(null);
  const [poolOpen, setPoolOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearUserMenuTimer = () => { if (userMenuTimer.current) { clearTimeout(userMenuTimer.current); userMenuTimer.current = null; } };
  const startUserMenuTimer = () => { clearUserMenuTimer(); userMenuTimer.current = setTimeout(() => setUserMenuOpen(false), 200); };
  const [wordCount, setWordCount] = useState(0);
  const [linkedEntities, setLinkedEntities] = useState<EditorEntity[]>([]);
  const [allEntities, setAllEntities] = useState<EditorEntity[]>([]);
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([]);
  const [storyTitle, setStoryTitle] = useState("");
  const [storyUniverseIds, setStoryUniverseIds] = useState<number[]>([]);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [sceneUniverseIds, setSceneUniverseIds] = useState<number[]>([]);
  const sceneUniverseIdsRef = useRef<number[]>([]);
  const [scenes, setScenes] = useState<SceneSummary[]>([]);
  const [sceneId, setSceneId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "idle">("idle");
  const [sceneTitle, setSceneTitle] = useState("");
  const sceneContentRef = useRef("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorResetRef = useRef<((content: string) => void) | null>(null);
  const insertEntityRef = useRef<((entity: EditorEntity) => void) | null>(null);
  const unlinkEntityRef = useRef<((entityId: string) => void) | null>(null);
  const highlightEntityRef = useRef<((entityId: string | null) => void) | null>(null);
  const [entityCounts, setEntityCounts] = useState<Record<string, number>>({});
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
    if (isLoaded && isSignedIn) loadData();
  }, [isLoaded, isSignedIn]);

  const loadData = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const [story, scenesData, entitiesData, typesData, universesData] = await Promise.all([
        getStory(token, storyId),
        getScenes(token, storyId),
        getEntities(token),
        getEntityTypes(token),
        getUniverses(token),
      ]);
      setStoryTitle(story.title);
      setStoryUniverseIds(story.universeIds ?? []);
      setUniverses(universesData);
      setScenes(scenesData);
      setAllEntities(entitiesData.map(toEditorEntity));
      setEntityTypes(typesData);
    } catch {
      console.error("Failed to load story data");
    }
  };

  const handleStoryTitleSave = async () => {
    if (!storyTitle.trim()) return;
    const token = await getToken();
    if (!token) return;
    try { await updateStory(token, storyId, storyTitle.trim(), storyUniverseIds); } catch {}
  };

  const handleStoryUniverseChange = async (ids: number[]) => {
    const removedIds = storyUniverseIds.filter(id => !ids.includes(id));

    // Expanding from 1 universe (implicit) to multiple — make the assignment explicit so chips retain color
    if (storyUniverseIds.length === 1 && ids.length > 1) {
      const prevUid = storyUniverseIds[0];
      setScenes(prev => prev.map(s =>
        s.universeIds.length === 0 ? { ...s, universeIds: [prevUid] } : s
      ));
      if (sceneUniverseIdsRef.current.length === 0) {
        sceneUniverseIdsRef.current = [prevUid];
        setSceneUniverseIds([prevUid]);
      }
    }

    // Strip removed universes from all scene state so re-adding starts fresh
    if (removedIds.length > 0) {
      setScenes(prev => prev.map(s => ({
        ...s,
        universeIds: s.universeIds.filter(uid => !removedIds.includes(uid)),
      })));
      const next = sceneUniverseIdsRef.current.filter(uid => !removedIds.includes(uid));
      sceneUniverseIdsRef.current = next;
      setSceneUniverseIds(next);
    }

    setStoryUniverseIds(ids);
    const token = await getToken();
    if (!token) return;
    try { await updateStory(token, storyId, storyTitle, ids); } catch {}
  };

  const handleSave = useCallback(async (title: string, content: string, id: number | null = sceneId): Promise<number | null> => {
    const token = await getToken();
    if (!token || !title.trim()) return id;
    const universeIds = sceneUniverseIdsRef.current;

    setSaveStatus("saving");
    try {
      if (id) {
        await updateScene(token, storyId, id, title, content, universeIds);
        setSaveStatus("saved");
        setScenes(prev => prev.map(s => s.id === id ? { ...s, title, universeIds, updatedAt: new Date().toISOString() } : s));
        return id;
      } else {
        const result = await saveScene(token, storyId, title, content, universeIds);
        setSceneId(result.id);
        setSaveStatus("saved");
        setScenes(prev => [...prev, { id: result.id, title, displayOrder: result.displayOrder, universeIds: result.universeIds, createdAt: result.createdAt, updatedAt: result.updatedAt }]);
        return result.id;
      }
    } catch {
      setSaveStatus("unsaved");
      return id;
    }
  }, [sceneId, storyId, getToken]);

  const triggerAutoSave = useCallback((title: string, content: string) => {
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(title, content), 2000);
  }, [handleSave]);

  const handleSceneSelect = async (scene: SceneSummary) => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    await handleSave(sceneTitle, sceneContentRef.current);
    const token = await getToken();
    if (!token) return;
    try {
      const full = await getScene(token, storyId, scene.id);
      setSceneId(full.id);
      setSceneTitle(full.title);
      sceneContentRef.current = full.content;
      editorResetRef.current?.(full.content);
      const effectiveIds = full.universeIds?.length > 0 ? full.universeIds : storyUniverseIds;
      sceneUniverseIdsRef.current = effectiveIds;
      setSceneUniverseIds(effectiveIds);
      setSaveStatus("saved");
    } catch {
      console.error("Failed to load scene");
    }
  };

  const handleSceneCreate = async () => {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null; }
    await handleSave(sceneTitle, sceneContentRef.current);
    setSceneId(null);
    setSceneTitle("");
    sceneContentRef.current = "";
    editorResetRef.current?.("");
    sceneUniverseIdsRef.current = storyUniverseIds;
    setSceneUniverseIds(storyUniverseIds);
    setSaveStatus("unsaved");
  };

  const handleSceneDelete = async (id: number) => {
    const token = await getToken();
    if (!token) return;
    try {
      await deleteScene(token, storyId, id);
      setScenes(prev => prev.filter(s => s.id !== id));
      if (sceneId === id) {
        setSceneId(null); setSceneTitle(""); sceneContentRef.current = "";
        editorResetRef.current?.(""); setSaveStatus("idle");
      }
    } catch {
      console.error("Failed to delete scene");
    }
  };

  const handleSceneRename = async (id: number, title: string) => {
    const token = await getToken();
    if (!token) return;
    try {
      const content = id === sceneId ? sceneContentRef.current : "";
      const universeIds = id === sceneId ? sceneUniverseIdsRef.current : scenes.find(s => s.id === id)?.universeIds ?? [];
      await updateScene(token, storyId, id, title, content, universeIds);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, title } : s));
      if (id === sceneId) setSceneTitle(title);
    } catch {
      console.error("Failed to rename scene");
    }
  };

  const handleSceneUniverseChange = async (id: number, uids: number[]) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, universeIds: uids } : s));
    if (id === sceneId) {
      sceneUniverseIdsRef.current = uids;
      setSceneUniverseIds(uids);
    }
    const token = await getToken();
    if (!token) return;
    try {
      const content = id === sceneId ? sceneContentRef.current : "";
      const title = id === sceneId ? sceneTitle : scenes.find(s => s.id === id)?.title ?? "";
      await updateScene(token, storyId, id, title, content, uids);
    } catch {}
  };

  const handleScenesReorder = async (orderedIds: number[]) => {
    const token = await getToken();
    if (!token) return;
    setScenes(prev => {
      const map = new Map(prev.map(s => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, displayOrder: i }));
    });
    try {
      await reorderScenes(token, storyId, orderedIds);
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
    if (deltaX > 0) setPanelMode(m => m === "sidebar" ? "none" : "manifest");
    else setPanelMode(m => m === "manifest" ? "none" : "sidebar");
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  const handleEntityCreate = async (name: string, entityTypeId: number): Promise<EditorEntity | null> => {
    try {
      const token = await getToken();
      if (!token) return null;
      const created = await createEntity(token, { name, entityTypeId, isPublic: true, isSecret: false, fieldValues: [], fieldRefValues: [] });
      const editorEntity = toEditorEntity(created);
      setAllEntities(prev => [...prev, editorEntity]);
      return editorEntity;
    } catch {
      return null;
    }
  };

  const distinctTypes = Array.from(new Set(allEntities.map(e => e.typeName)));
  const filtered = allEntities.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "all" || e.typeName === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const sceneUniversePool = storyUniverseIds.length > 0
    ? universes.filter(u => storyUniverseIds.includes(u.id))
    : universes;

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
      {/* Breadcrumb row */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 16px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
        <Link href="/" style={{ color: "var(--fg-muted)", fontSize: "12px", fontFamily: "monospace", textDecoration: "none", flexShrink: 0 }}>← stories</Link>
        <span style={{ color: "var(--border)", fontSize: "12px", flexShrink: 0 }}>|</span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <input
            value={storyTitle}
            onChange={e => setStoryTitle(e.target.value)}
            onBlur={handleStoryTitleSave}
            style={{ background: "none", border: "none", outline: "none", color: "var(--fg)", fontSize: "13px", fontFamily: "monospace", minWidth: 0 }}
          />
          <div
            style={{ position: "relative", flexShrink: 0 }}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPoolOpen(false); }}
            tabIndex={-1}
          >
            <button
              onClick={() => setPoolOpen(o => !o)}
              style={{ background: "none", border: "1px solid var(--border)", color: storyUniverseIds.length > 0 ? "var(--fg)" : "var(--fg-muted)", fontSize: "11px", fontFamily: "monospace", padding: "3px 8px", borderRadius: "4px", cursor: "pointer" }}
            >
              {storyUniverseIds.length === 0
                ? "universe pool ▾"
                : storyUniverseIds.length === 1
                  ? `${universes.find(u => u.id === storyUniverseIds[0])?.name ?? "1 universe"} ▾`
                  : `${storyUniverseIds.length} universes ▾`}
            </button>
            {poolOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", zIndex: 50, minWidth: "160px", padding: "4px 0", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                {universes.length === 0
                  ? <span style={{ display: "block", padding: "6px 12px", color: "var(--fg-muted)", fontSize: "12px", fontFamily: "monospace" }}>no universes yet</span>
                  : universes.map(u => {
                    const active = storyUniverseIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", color: "var(--fg)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => handleStoryUniverseChange(active ? storyUniverseIds.filter(id => id !== u.id) : [...storyUniverseIds, u.id])}
                          style={{ accentColor: "var(--accent)" }}
                        />
                        {u.name}
                      </label>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
        <div
          style={{ position: "relative", flexShrink: 0 }}
          onMouseEnter={() => { clearUserMenuTimer(); setUserMenuOpen(true); }}
          onMouseLeave={startUserMenuTimer}
        >
          <button style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "2px 4px" }}>•••</button>
          {userMenuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", zIndex: 50, minWidth: "120px", padding: "4px 0", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              <button
                onClick={() => signOut(() => { window.location.href = "/sign-in"; })}
                style={{ display: "block", width: "100%", background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "12px", fontFamily: "monospace", padding: "6px 12px", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >sign out</button>
            </div>
          )}
        </div>
        <button
          onClick={cyclePanel}
          style={{ background: "none", border: "none", color: panelMode !== "none" ? "var(--accent)" : "var(--fg-muted)", cursor: "pointer", fontSize: "18px", lineHeight: 1, flexShrink: 0, padding: "2px 4px" }}
          title="Toggle panels"
        >
          {panelIcon}
        </button>
      </div>

      {/* Panels row */}
      <div className="main-layout" style={{ flex: 1, overflow: "hidden" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {(manifestOpen || sidebarOpen) && (
          <div className="lg-hidden" onClick={() => setPanelMode("none")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 15 }} />
        )}

        {/* Left — Manifest */}
        <div className={`drawer drawer-left ${manifestOpen ? "open" : "closed"}`}>
          <Manifest
            entities={linkedEntities}
            scenes={scenes}
            currentSceneId={sceneId}
            onSceneSelect={handleSceneSelect}
            onSceneCreate={handleSceneCreate}
            onSceneDelete={handleSceneDelete}
            onSceneRename={handleSceneRename}
            onScenesReorder={handleScenesReorder}
            universes={universes}
            storyUniverseIds={storyUniverseIds}
            onSceneUniverseChange={handleSceneUniverseChange}
            onEntityEdit={id => setModalEntityId(id)}
            onEntityView={id => setViewEntityId(id)}
            onEntityUnlink={entityId => unlinkEntityRef.current?.(entityId)}
            onEntityHighlight={entityId => highlightEntityRef.current?.(entityId)}
            entityCounts={entityCounts}
          />
        </div>

        {/* Center — Editor */}
        <div className="editor-column">
          {/* Scene controls row */}
          <div style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px" }}>
              <input
                placeholder="Scene title..."
                value={sceneTitle}
                onChange={e => { setSceneTitle(e.target.value); triggerAutoSave(e.target.value, sceneContentRef.current); }}
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--fg)", fontSize: "17px", fontFamily: "Georgia, serif", minWidth: 0 }}
              />
              <span style={{ fontSize: "11px", color: "var(--fg-muted)", fontFamily: "monospace", flexShrink: 0 }}>{wordCount}w</span>
              <span style={{ fontSize: "11px", color: saveStatus === "saved" ? "var(--green)" : saveStatus === "saving" ? "var(--accent)" : saveStatus === "unsaved" ? "var(--red)" : "var(--fg-muted)", fontFamily: "monospace", flexShrink: 0 }}>
                {saveStatus === "saved" ? "saved" : saveStatus === "saving" ? "saving..." : saveStatus === "unsaved" ? "unsaved" : ""}
              </span>
              <button onClick={() => handleSave(sceneTitle, sceneContentRef.current)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--fg-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "monospace", flexShrink: 0, padding: "3px 8px", borderRadius: "4px" }}>save</button>
            </div>
            {saveStatus !== "idle" && sceneUniversePool.length > 1 && (
              <div style={{ display: "flex", gap: "4px", padding: "0 16px 8px", flexWrap: "wrap" }}>
                {sceneUniversePool.map(u => {
                  const active = sceneUniverseIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={async () => {
                        const next = active ? sceneUniverseIds.filter(id => id !== u.id) : [...sceneUniverseIds, u.id];
                        sceneUniverseIdsRef.current = next;
                        setSceneUniverseIds(next);
                        if (sceneId !== null) {
                          setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, universeIds: next } : s));
                          const token = await getToken();
                          if (!token) return;
                          try { await updateScene(token, storyId, sceneId, sceneTitle, sceneContentRef.current, next); } catch {}
                        }
                      }}
                      style={{ background: active ? "var(--accent-dim)" : "none", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, color: active ? "var(--accent)" : "var(--fg-muted)", fontSize: "10px", fontFamily: "monospace", padding: "2px 8px", borderRadius: "10px", cursor: "pointer" }}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "32px 24px" }}>
            <div style={{ maxWidth: "680px", margin: "0 auto", minHeight: "100%" }}>
              <Editor
                entities={allEntities}
                entityTypes={entityTypes}
                onEntityCreate={handleEntityCreate}
                onWordCountChange={setWordCount}
                onEntitiesChange={setLinkedEntities}
                onContentChange={content => { sceneContentRef.current = content; triggerAutoSave(sceneTitle, content); }}
                onResetRef={editorResetRef}
                insertEntityRef={insertEntityRef}
                unlinkEntityRef={unlinkEntityRef}
                highlightEntityRef={highlightEntityRef}
                onEntityCountsChange={setEntityCounts}
                onEntityEdit={id => setModalEntityId(id)}
                onEntityView={id => setViewEntityId(id)}
              />
            </div>
          </div>
        </div>

        {/* Right — Entity Sidebar */}
        <div className={`drawer drawer-right ${sidebarOpen ? "open" : "closed"}`}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: "var(--fg-muted)", fontFamily: "monospace" }}>ENTITIES</span>
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
            {(["all", ...distinctTypes] as string[]).map(type => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                style={{ background: activeFilter === type ? "var(--accent-dim)" : "var(--surface-2)", border: `1px solid ${activeFilter === type ? "var(--accent)" : "var(--border)"}`, color: activeFilter === type ? "var(--accent)" : "var(--fg-muted)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace", letterSpacing: "0.06em" }}
              >
                {type}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {filtered.map(entity => (
              <div
                key={entity.id}
                className="sidebar-entity-row"
                style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ color: entity.typeColor ?? "var(--accent)", fontSize: "12px", flexShrink: 0 }}>{entity.typeIcon ?? "◈"}</span>
                <span style={{ color: "var(--fg)", fontSize: "13px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entity.name}</span>
                <button
                  onClick={() => insertEntityRef.current?.(entity)}
                  title="Insert at cursor"
                  style={{ background: "none", border: "none", color: "var(--fg-muted)", cursor: "pointer", fontSize: "13px", padding: "2px 4px", flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; }}
                  onMouseLeave={e => { e.stopPropagation(); (e.currentTarget as HTMLButtonElement).style.color = "var(--fg-muted)"; }}
                >↵</button>
                <EntityActionButtons
                  entityId={entity.id}
                  onQuickEdit={() => setModalEntityId(Number(entity.id))}
                  onQuickView={() => setViewEntityId(Number(entity.id))}
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "13px", fontStyle: "italic" }}>No entities match.</p>
            )}
          </div>
        </div>

      </div>

      <EntityViewModal
        entityId={viewEntityId}
        onClose={() => setViewEntityId(null)}
        onQuickEdit={id => { setViewEntityId(null); setModalEntityId(id); }}
      />
      <EntityEditModal
        entityId={modalEntityId}
        onClose={() => setModalEntityId(null)}
        onSaved={updatedName => setAllEntities(prev => prev.map(e => e.id === String(modalEntityId) ? { ...e, name: updatedName } : e))}
      />
    </div>
  );
}
