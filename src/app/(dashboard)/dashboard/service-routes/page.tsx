"use client";

import { useState, useEffect, useCallback } from "react";
import type { ServiceRoute } from "@/lib/ops-types";
import { MultiSelect } from "primereact/multiselect";

const STATUSES = [
  { id: "planned",   label: "Planlandı",   bg: "bg-slate-100 text-slate-600 border border-slate-200" },
  { id: "active",    label: "Aktif",        bg: "bg-blue-50 text-blue-700 border border-blue-200" },
  { id: "completed", label: "Tamamlandı",  bg: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { id: "cancelled", label: "İptal",        bg: "bg-red-50 text-red-700 border border-red-200" },
];

function useLeaflet() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).L) {
      setLoaded(true);
      return;
    }

    let link = document.querySelector('link[href*="leaflet.css"]');
    if (!link) {
      link = document.createElement("link");
      (link as any).rel = "stylesheet";
      (link as any).href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let script = document.querySelector('script[src*="leaflet.js"]');
    if (!script) {
      script = document.createElement("script");
      (script as any).src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      (script as any).async = true;
      script.addEventListener("load", () => {
        setLoaded(true);
      });
      document.body.appendChild(script);
    } else {
      if ((window as any).L) {
        setLoaded(true);
      }
    }
  }, []);

  return loaded;
}

// OSRM Real Road Routing Fetcher with Haversine Fallback
const fetchOSRMRoute = async (points: any[]) => {
  if (points.length < 2) return null;
  try {
    const coords = points.map(pt => `${pt[1]},${pt[0]}`).join(";");
    const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&continue_straight=false`);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const pathCoords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
        const distanceKm = route.distance / 1000;
        return { pathCoords, distanceKm };
      }
    }
  } catch (err) {
    console.error("OSRM route fetch failed, falling back to Haversine:", err);
  }

  // Fallback to Haversine straight line
  let fallbackDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [lat1, lon1] = points[i];
    const [lat2, lon2] = points[i + 1];
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    fallbackDist += R * c;
  }
  return { pathCoords: points, distanceKm: fallbackDist };
};

export default function ServiceRoutesPage() {
  const [routes,   setRoutes]   = useState<ServiceRoute[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plate: string; brand: string | null; model: string | null }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [modal,    setModal]    = useState<"new" | ServiceRoute | null>(null);
  const [previewRoute, setPreviewRoute] = useState<ServiceRoute | null>(null);
  
  const [form, setForm] = useState({
    id: "",
    name: "",
    vehicleId: "",
    driverId: "",
    stops: "",
    notes: "",
    path: "", // stringified array of coordinates: "[[lat, lng], ...]"
    passengerIds: "[]", // stringified JSON array
    distance: 0,
  });
  
  const [saving, setSaving] = useState(false);
  const leafletLoaded = useLeaflet();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/modules/service-routes");
      if (r.ok) {
        const d = await r.json() as {
          routes: ServiceRoute[];
          vehicles: { id: string; plate: string; brand: string | null; model: string | null }[];
          employees: { id: string; name: string }[];
        };
        setRoutes(d.routes);
        setVehicles(d.vehicles);
        if (d.employees) setEmployees(d.employees);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Handle Edit Click
  function openEdit(r: ServiceRoute) {
    setForm({
      id: r.id,
      name: r.name,
      vehicleId: r.vehicleId ?? "",
      driverId: r.driverId ?? "",
      stops: r.stops ?? "",
      notes: r.notes ?? "",
      path: r.path ?? "[]",
      passengerIds: r.passengerIds ?? "[]",
      distance: r.distance ?? 0,
    });
    setModal(r);
  }

  // Save creation or updates
  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        vehicleId: form.vehicleId || null,
        driverId: form.driverId || null,
        stops: form.stops || null,
        path: form.path || "[]",
        passengerIds: form.passengerIds || "[]",
        distance: form.distance ? Number(form.distance) : 0,
        notes: form.notes || null,
      };

      if (modal === "new") {
        await fetch("/api/modules/service-routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else if (modal && typeof modal === "object") {
        await fetch("/api/modules/service-routes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: modal.id, ...payload }),
        });
      }

      setModal(null);
      setForm({ id: "", name: "", vehicleId: "", driverId: "", stops: "", notes: "", path: "", passengerIds: "[]", distance: 0 });
      await load();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  // Delete Service Route
  async function deleteRoute(id: string) {
    if (!confirm("Bu servis güzergahını silmek istiyor musunuz?")) return;
    try {
      await fetch("/api/modules/service-routes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  // Quick Status changer
  async function changeStatus(id: string, status: string) {
    try {
      await fetch("/api/modules/service-routes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } catch (e) {
      console.error(e);
    }
  }

  // CLEAR Path in Form Map
  function clearPath() {
    setForm(p => ({ ...p, path: "[]", stops: "", distance: 0 }));
    const map = (window as any)._leafletMap;
    if (map) {
      map.eachLayer((layer: any) => {
        if (layer.options && !layer.options.attribution) {
          map.removeLayer(layer);
        }
      });
      const L = (window as any).L;
      if (L) {
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          subdomains: 'abcd',
          maxZoom: 20
        }).addTo(map);
      }
    }
  }

  // Handle Dynamic Stop Name Change in list input
  function handleStopNameChange(index: number, newName: string) {
    setForm(p => {
      const currentStops = p.stops ? p.stops.split(",") : [];
      while (currentStops.length <= index) {
        currentStops.push(`Durak ${currentStops.length + 1}`);
      }
      currentStops[index] = newName;
      const updatedStopsStr = currentStops.join(",");

      // Update Leaflet marker popup dynamically if map exists
      const map = (window as any)._leafletMap;
      if (map && (window as any)._leafletMarkers && (window as any)._leafletMarkers[index]) {
        (window as any)._leafletMarkers[index].setPopupContent(newName).openPopup();
      }

      return { ...p, stops: updatedStopsStr };
    });
  }

  // Remove a stop dynamically
  async function removeStop(index: number) {
    const map = (window as any)._leafletMap;
    const markers = (window as any)._leafletMarkers;
    if (map && markers && markers[index]) {
      map.removeLayer(markers[index]);
      markers.splice(index, 1);
    }

    let nextPoints: [number, number][] = [];
    try {
      nextPoints = form.path ? JSON.parse(form.path) : [];
    } catch (e) {}

    nextPoints.splice(index, 1);

    const currentStops = form.stops ? form.stops.split(",") : [];
    currentStops.splice(index, 1);

    const nextPathStr = JSON.stringify(nextPoints);
    const nextStopsStr = currentStops.join(",");

    let newDistance = 0;
    if (nextPoints.length > 1) {
      const routeData = await fetchOSRMRoute(nextPoints);
      newDistance = routeData ? routeData.distanceKm : 0;

      if (map) {
        if ((window as any)._leafletPolyline) {
          map.removeLayer((window as any)._leafletPolyline);
        }
        const polyCoords = routeData ? routeData.pathCoords : nextPoints;
        const L = (window as any).L;
        if (L) {
          const poly = L.polyline(polyCoords, { color: "var(--color-primary, #6366f1)", weight: 4.5, opacity: 0.95 }).addTo(map);
          (window as any)._leafletPolyline = poly;
        }
      }
    } else {
      if (map && (window as any)._leafletPolyline) {
        map.removeLayer((window as any)._leafletPolyline);
        (window as any)._leafletPolyline = null;
      }
    }

    if (map && markers && markers.length > 0) {
      const L = (window as any).L;
      if (L) {
        const group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.15));
      }
    }

    setForm(p => ({
      ...p,
      stops: nextStopsStr,
      path: nextPathStr,
      distance: newDistance,
    }));
  }

  // Mapping Passenger Names from passengerIds
  function getPassengerNames(passengerIdsStr: string | null) {
    if (!passengerIdsStr) return "";
    try {
      const ids = JSON.parse(passengerIdsStr) as string[];
      if (!Array.isArray(ids)) return "";
      return ids.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ");
    } catch(e) {
      // fallback
      return passengerIdsStr ? passengerIdsStr.split(",").map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(", ") : "";
    }
  }

  // EFFECT FOR FORM HARİTASI (Interactive Drawing Map)
  useEffect(() => {
    if (!leafletLoaded || !modal) return;

    const t = setTimeout(() => {
      const mapEl = document.getElementById("route-map");
      if (!mapEl) return;

      const L = (window as any).L;
      if (!L) return;

      let initialCoords = [41.0082, 28.9784];
      let parsedPath: [number, number][] = [];
      if (form.path) {
        try {
          parsedPath = JSON.parse(form.path);
          if (parsedPath.length > 0) {
            initialCoords = parsedPath[0];
          }
        } catch (e) {
          console.error(e);
        }
      }

      const stopsList = form.stops ? form.stops.split(",") : [];

      if ((window as any)._leafletMap) {
        (window as any)._leafletMap.remove();
      }

      const map = L.map("route-map").setView(initialCoords, 11);
      (window as any)._leafletMap = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const markers: any[] = [];
      (window as any)._leafletMarkers = markers;
      let polyline: any = null;
      (window as any)._leafletPolyline = polyline;

      function updatePolyline(points: any[]) {
        if ((window as any)._leafletPolyline) {
          map.removeLayer((window as any)._leafletPolyline);
        }
        if (points.length > 1) {
          polyline = L.polyline(points, { color: "var(--color-primary, #6366f1)", weight: 4.5, opacity: 0.95 }).addTo(map);
          (window as any)._leafletPolyline = polyline;
        } else {
          (window as any)._leafletPolyline = null;
        }
      }

      // Draw loaded/existing points and fetch actual road coordinates dynamically
      async function initRouteDrawing() {
        if (parsedPath.length > 0) {
          parsedPath.forEach((pt, index) => {
            const stopName = stopsList[index] ? stopsList[index].trim() : `Durak ${index + 1}`;
            const marker = L.marker(pt, { draggable: true }).addTo(map)
              .bindPopup(stopName)
              .openPopup();
            
            markers.push(marker);

            marker.on('dragend', async () => {
              const dragged = markers.map(m => {
                const pos = m.getLatLng();
                return [pos.lat, pos.lng];
              });
              const routeData = await fetchOSRMRoute(dragged);
              updatePolyline(routeData ? routeData.pathCoords : dragged);
              setForm(p => ({
                ...p,
                path: JSON.stringify(dragged),
                distance: routeData ? routeData.distanceKm : p.distance
              }));
            });
          });

          // Fetch exact snap-to-roads route
          const routeData = await fetchOSRMRoute(parsedPath);
          updatePolyline(routeData ? routeData.pathCoords : parsedPath);
          setForm(p => ({ ...p, distance: routeData ? routeData.distanceKm : p.distance }));
          
          const group = new L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.15));
        }
      }

      void initRouteDrawing();

      // Handle map clicks to draw path stops
      map.on("click", async (e: any) => {
        const latLng = e.latlng;
        const pt: [number, number] = [latLng.lat, latLng.lng];

        const nextIndex = markers.length + 1;
        const nextStopName = `Durak ${nextIndex}`;

        const marker = L.marker(pt, { draggable: true }).addTo(map)
          .bindPopup(nextStopName)
          .openPopup();
        
        markers.push(marker);

        const nextPoints = markers.map(m => {
          const l = m.getLatLng();
          return [l.lat, l.lng];
        }) as [number, number][];

        // Fetch OSRM Snapped route coordinates
        const routeData = await fetchOSRMRoute(nextPoints);
        updatePolyline(routeData ? routeData.pathCoords : nextPoints);

        setForm(p => {
          const currentStops = p.stops ? p.stops.split(",") : [];
          const nextStops = [...currentStops].filter(Boolean);
          while (nextStops.length < nextIndex) {
            nextStops.push(`Durak ${nextStops.length + 1}`);
          }
          nextStops[nextIndex - 1] = nextStopName;
          return {
            ...p,
            stops: nextStops.join(","),
            path: JSON.stringify(nextPoints),
            distance: routeData ? routeData.distanceKm : 0,
          };
        });

        marker.on('dragend', async () => {
          const dragged = markers.map(m => {
            const pos = m.getLatLng();
            return [pos.lat, pos.lng];
          });
          const routeData2 = await fetchOSRMRoute(dragged);
          updatePolyline(routeData2 ? routeData2.pathCoords : dragged);
          setForm(p => ({
            ...p,
            path: JSON.stringify(dragged),
            distance: routeData2 ? routeData2.distanceKm : 0
          }));
        });
      });

    }, 200);

    return () => clearTimeout(t);
  }, [leafletLoaded, modal]);

  // EFFECT FOR PREVIEW HARİTASI (Read-only Preview Map)
  useEffect(() => {
    if (!leafletLoaded || !previewRoute || !previewRoute.path) return;

    const t = setTimeout(async () => {
      const previewEl = document.getElementById("preview-map");
      if (!previewEl) return;

      const L = (window as any).L;
      if (!L) return;

      let parsedPath: [number, number][] = [];
      try {
        parsedPath = JSON.parse(previewRoute.path as string);
      } catch (e) {
        console.error(e);
      }

      if (parsedPath.length === 0) return;

      if ((window as any)._leafletPreviewMap) {
        (window as any)._leafletPreviewMap.remove();
      }

      const map = L.map("preview-map").setView(parsedPath[0], 12);
      (window as any)._leafletPreviewMap = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      const markers: any[] = [];
      const stopsList = previewRoute.stops ? previewRoute.stops.split(",") : [];

      parsedPath.forEach((pt, index) => {
        const stopName = stopsList[index] ? stopsList[index].trim() : `Durak ${index + 1}`;
        const marker = L.marker(pt).addTo(map).bindPopup(stopName);
        markers.push(marker);
      });

      // Snapped to roads on preview dynamically too!
      const routeData = await fetchOSRMRoute(parsedPath);
      const drawCoords = routeData ? routeData.pathCoords : parsedPath;
      L.polyline(drawCoords, { color: "var(--color-primary, #6366f1)", weight: 5, opacity: 0.95 }).addTo(map);

      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }, 200);

    return () => clearTimeout(t);
  }, [leafletLoaded, previewRoute]);

  const activeRoutesCount = routes.filter(r => r.status === "active").length;
  const plannedRoutesCount = routes.filter(r => r.status === "planned").length;
  const completedRoutesCount = routes.filter(r => r.status === "completed").length;

  let parsedPoints: [number, number][] = [];
  try {
    parsedPoints = form.path ? JSON.parse(form.path) : [];
  } catch (e) {}
  const stopsList = form.stops ? form.stops.split(",") : [];

  // Parse MultiSelect Passenger values
  let selectedPassengerIds: string[] = [];
  if (form.passengerIds) {
    try {
      selectedPassengerIds = JSON.parse(form.passengerIds);
      if (!Array.isArray(selectedPassengerIds)) selectedPassengerIds = [];
    } catch(e) {
      selectedPassengerIds = form.passengerIds ? form.passengerIds.split(",") : [];
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm" style={{ background: "var(--color-primary, #6366f1)" }}>
            <i className="pi pi-map text-base" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-xl leading-tight">Servis Güzergahları</h1>
            <p className="text-xs text-slate-400">Harita destekli yol çizimi, durak isimlendirme, gerçek karayolu mesafesi ve yolcu planlama</p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ id: "", name: "", vehicleId: "", driverId: "", stops: "", notes: "", path: "[]", passengerIds: "[]", distance: 0 });
            setModal("new");
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-95 active:scale-[0.99] transition shadow-sm"
          style={{ background: "var(--color-primary, #6366f1)" }}
        >
          <i className="pi pi-plus text-xs" /> Yeni Güzergah Çiz
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400">Toplam Güzergah</p>
          <h2 className="text-2xl font-extrabold text-foreground mt-1">{routes.length}</h2>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 text-blue-500">Aktif Seferler</p>
          <h2 className="text-2xl font-extrabold text-foreground mt-1">{activeRoutesCount}</h2>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 text-slate-500">Planlananlar</p>
          <h2 className="text-2xl font-extrabold text-foreground mt-1">{plannedRoutesCount}</h2>
        </div>
        <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 text-emerald-500">Tamamlananlar</p>
          <h2 className="text-2xl font-extrabold text-foreground mt-1">{completedRoutesCount}</h2>
        </div>
      </div>

      {/* Listing Grid */}
      <div className="rounded-2xl border border-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="overflow-x-auto relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 z-10 flex items-center justify-center">
              <i className="pi pi-spin pi-spinner text-3xl text-primary" style={{ color: "var(--color-primary)" }} />
            </div>
          )}
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold">
                <th className="py-3.5 px-5">Güzergah Bilgileri</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Sorumlu Sürücü & Yolcular</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Plaka & Araç</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Duraklar & Karayolu</th>
                <th className="py-3.5 px-4">Durum</th>
                <th className="py-3.5 px-4 text-right pr-5">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <i className="pi pi-map text-5xl block mb-3 opacity-20" />
                    Kayıtlı servis güzergahı bulunamadı. Yeni bir güzergah ekleyerek başlayın.
                  </td>
                </tr>
              ) : (
                routes.map((r) => {
                  const ss = STATUSES.find((s) => s.id === r.status) ?? STATUSES[0];
                  const passengersNames = getPassengerNames(r.passengerIds);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                      <td className="py-4 px-5">
                        <p className="font-bold text-foreground">{r.name}</p>
                        {r.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{r.notes}</p>}
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        <div className="space-y-1.5">
                          {r.driver ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                              <i className="pi pi-user text-[10px]" /> Sürücü: {r.driver.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs block">Sürücü: Atanmamış</span>
                          )}
                          {passengersNames && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate max-w-[200px]" title={`Yolcular: ${passengersNames}`}>
                              👥 {passengersNames}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        {r.vehicle ? (
                          <span className="font-bold text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30 px-2.5 py-0.5 rounded-md font-mono">
                            🚘 {r.vehicle.plate}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">— Araç Yok —</span>
                        )}
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell text-xs text-slate-400">
                        {r.stops ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">
                              {r.stops.split(",").length} durak
                            </p>
                            {r.distance ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 px-2 py-0.5 rounded-md">
                                📍 {Number(r.distance).toFixed(1)} km (Karayolu)
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-bold border-0 cursor-pointer focus:outline-none ${ss.bg}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {r.path && parsedPoints.length > 0 && (
                            <button
                              onClick={() => setPreviewRoute(r)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <i className="pi pi-map-marker text-[10px]" /> Harita
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(r)}
                            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                            title="Düzenle"
                          >
                            <i className="pi pi-pencil text-xs" />
                          </button>
                          <button
                            onClick={() => deleteRoute(r.id)}
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition"
                            title="Sil"
                          >
                            <i className="pi pi-trash text-xs" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE & EDIT MAP MODAL */}
      {modal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left side: Form fields */}
            <div className="w-full md:w-[380px] p-5 border-b md:border-b-0 md:border-r border-border overflow-y-auto flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h2 className="font-bold text-foreground text-base">
                    {modal === "new" ? "Yeni Güzergah Çiz" : "Güzergahı Düzenle"}
                  </h2>
                  <button onClick={() => setModal(null)} className="text-slate-400 hover:text-foreground">
                    <i className="pi pi-times" />
                  </button>
                </div>

                <div className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Güzergah Adı *</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ör. Kadıköy - Ümraniye Servisi"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Sorumlu Sürücü / Personel</label>
                    <div className="relative">
                      <select
                        value={form.driverId}
                        onChange={(e) => setForm((p) => ({ ...p, driverId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">— Sürücü Seçin —</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                      <i className="pi pi-user absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Servis Aracı (Plaka)</label>
                    <div className="relative">
                      <select
                        value={form.vehicleId}
                        onChange={(e) => setForm((p) => ({ ...p, vehicleId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">— Araç Seçin —</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>{v.plate} {v.brand ? `(${v.brand})` : ""}</option>
                        ))}
                      </select>
                      <i className="pi pi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none" />
                    </div>
                  </div>

                  {/* MultiSelect Passengers */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Güzergahı Kullanan Personeller (Yolcular)</label>
                    <MultiSelect
                      value={selectedPassengerIds}
                      options={employees.map(emp => ({ label: emp.name, value: emp.id }))}
                      onChange={(e) => setForm(p => ({ ...p, passengerIds: JSON.stringify(e.value) }))}
                      optionLabel="label"
                      placeholder="Personelleri Seçin"
                      maxSelectedLabels={3}
                      className="w-full text-sm text-foreground bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                      style={{ minHeight: "38px", display: "flex", alignItems: "center" }}
                      panelClassName="text-sm border border-border bg-white dark:bg-slate-900 rounded-lg shadow-xl text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Notlar / Açıklama</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-border text-foreground text-xs focus:outline-none resize-none"
                      placeholder="Güzergah detayları, saat notları vb..."
                    />
                  </div>

                  {/* Editable Stop Names List */}
                  {parsedPoints.length > 0 && (
                    <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border border-border/60 rounded-lg p-2.5 bg-slate-50/50 dark:bg-slate-950/20">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Durak İsimlerini Düzenle</p>
                      {parsedPoints.map((pt, index) => {
                        const stopName = stopsList[index] ? stopsList[index].trim() : `Durak ${index + 1}`;
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-5 text-right">{index + 1}.</span>
                            <input
                              value={stopName}
                              onChange={(e) => handleStopNameChange(index, e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded border border-border text-foreground text-xs focus:outline-none"
                              placeholder={`Durak ${index + 1}`}
                            />
                            <button
                              type="button"
                              onClick={() => removeStop(index)}
                              className="w-6 h-6 rounded flex items-center justify-center border border-red-200 dark:border-red-950 hover:bg-red-50 text-red-500 transition shrink-0"
                              title="Durağı Kaldır"
                            >
                              <i className="pi pi-trash text-[10px]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 mt-5 border-t border-border pt-4">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground text-sm hover:bg-slate-100 transition font-semibold"
                >
                  İptal
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.name}
                  className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition"
                  style={{ background: "var(--color-primary, #6366f1)" }}
                >
                  {saving ? <i className="pi pi-spin pi-spinner" /> : modal === "new" ? "Çizimi Kaydet" : "Güncelle"}
                </button>
              </div>
            </div>

            {/* Right side: Leaflet interactive drawing map */}
            <div className="flex-1 h-96 md:h-auto min-h-[350px] relative bg-slate-50 dark:bg-slate-950/20">
              {!leafletLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                  <i className="pi pi-spin pi-spinner text-3xl text-primary" style={{ color: "var(--color-primary)" }} />
                  <p className="text-xs text-slate-400">Harita modülü yükleniyor...</p>
                </div>
              ) : (
                <>
                  <div id="route-map" className="w-full h-full" />
                  
                  {/* Floating Distance and Action indicators */}
                  <div className="absolute top-3 left-3 z-[1000] flex gap-2">
                    <span className="px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-border shadow-md text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      📍 Toplam Mesafe: <span className="text-emerald-600 font-extrabold">{form.distance ? `${Number(form.distance).toFixed(2)} km` : "0.00 km"}</span>
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 z-[1000] flex gap-2">
                    <button
                      onClick={clearPath}
                      className="px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-border shadow-md hover:bg-red-50 hover:text-red-600 text-xs font-bold transition flex items-center gap-1 text-slate-600"
                    >
                      <i className="pi pi-trash" /> Çizimi Temizle
                    </button>
                  </div>
                  
                  <div className="absolute bottom-3 left-3 right-3 z-[1000] p-2 bg-white/95 dark:bg-slate-900/95 border border-border/80 rounded-xl shadow-lg text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5 pointer-events-none">
                    <i className="pi pi-info-circle text-indigo-500 text-xs shrink-0" />
                    <span><b>Karayolu Çizim Kılavuzu:</b> Haritada istediğiniz durak noktalarına sırayla tıklayın. Yol çizgisi otomatik olarak sokaklara kenetlenecektir (Snap-to-Roads).</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* READ-ONLY PREVIEW MAP MODAL */}
      {previewRoute && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewRoute(null)}>
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-base">Güzergah Harita Önizlemesi — {previewRoute.name}</h3>
                <div className="flex items-center gap-3.5 mt-0.5 text-xs text-slate-400">
                  {previewRoute.driver && (
                    <span>Sürücü: <b>{previewRoute.driver.name}</b></span>
                  )}
                  {previewRoute.distance && (
                    <span className="text-emerald-600 font-semibold">📍 Mesafe: <b>{Number(previewRoute.distance).toFixed(2)} km (Karayolu)</b></span>
                  )}
                </div>
              </div>
              <button onClick={() => setPreviewRoute(null)} className="text-slate-400 hover:text-foreground">
                <i className="pi pi-times" />
              </button>
            </div>

            {/* Map Area */}
            <div className="flex-1 min-h-[420px] relative bg-slate-50">
              {!leafletLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <i className="pi pi-spin pi-spinner text-3xl text-primary" style={{ color: "var(--color-primary)" }} />
                </div>
              ) : (
                <div id="preview-map" className="w-full h-[420px]" />
              )}
            </div>

            {/* Footer summary */}
            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-border flex items-center justify-between text-xs text-slate-500">
              <span><b>Durak Sıralaması:</b> {previewRoute.stops || "—"}</span>
              <button
                onClick={() => setPreviewRoute(null)}
                className="px-4 py-2 border border-border bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-100 text-foreground font-semibold transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
