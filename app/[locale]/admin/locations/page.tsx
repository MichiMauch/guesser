"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import SwitzerlandMap from "@/components/Map";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  difficulty: string;
}

export default function AdminLocationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [markerPosition, setMarkerPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    locationId: string | null;
    locationName: string;
  }>({
    isOpen: false,
    locationId: null,
    locationName: "",
  });

  const isSuperAdmin = session?.user?.email === "michi.mauch@netnode.ch";

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !isSuperAdmin) {
      router.push(`/${locale}`);
      return;
    }
    fetchLocations();
  }, [session, status, isSuperAdmin, router, locale]);

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (err) {
      console.error("Error fetching locations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markerPosition) {
      setError("Bitte setze einen Marker auf der Karte");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          latitude: markerPosition.lat,
          longitude: markerPosition.lng,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create location");
      }

      toast.success("Ort hinzugefügt");
      setName("");
      setMarkerPosition(null);
      setDifficulty("medium");
      fetchLocations();
    } catch {
      setError("Fehler beim Speichern des Ortes");
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (locationId: string, locationName: string) => {
    setDeleteModal({ isOpen: true, locationId, locationName });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, locationId: null, locationName: "" });
  };

  const handleDelete = async () => {
    if (!deleteModal.locationId) return;

    try {
      const response = await fetch(
        `/api/locations?id=${deleteModal.locationId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Ort gelöscht");
        fetchLocations();
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch (err) {
      console.error("Error deleting location:", err);
      toast.error("Fehler beim Löschen");
    } finally {
      closeDeleteModal();
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError("");

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        throw new Error("Die Datei muss ein JSON-Array enthalten");
      }

      const response = await fetch("/api/locations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.details?.join("\n") || result.error || "Import fehlgeschlagen"
        );
      }

      toast.success(`${result.imported} Orte erfolgreich importiert!`);
      fetchLocations();
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Fehler beim Import"
      );
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const difficultyOptions = [
    { value: "easy", label: "Einfach", color: "success" },
    { value: "medium", label: "Mittel", color: "warning" },
    { value: "hard", label: "Schwer", color: "error" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-h2 text-text-primary">Orte verwalten</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Add new location */}
          <Card variant="surface" padding="lg">
            <h2 className="text-h3 text-text-primary mb-6">Neuen Ort hinzufügen</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Ortsname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Matterhorn"
                required
              />

              <div>
                <label className="block text-body-small font-medium text-text-primary mb-2">
                  Position auf der Karte setzen
                </label>
                <div className="rounded-xl overflow-hidden border border-glass-border">
                  <SwitzerlandMap
                    onMarkerPlace={setMarkerPosition}
                    markerPosition={markerPosition}
                    height="300px"
                  />
                </div>
                {markerPosition && (
                  <p className="text-caption text-text-muted mt-2">
                    Koordinaten: {markerPosition.lat.toFixed(4)}, {markerPosition.lng.toFixed(4)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-body-small font-medium text-text-primary">
                  Schwierigkeit
                </label>
                <div className="flex gap-2">
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDifficulty(option.value)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border-2 font-medium transition-all",
                        difficulty === option.value
                          ? option.value === "easy"
                            ? "border-success bg-success/10 text-success"
                            : option.value === "medium"
                            ? "border-warning bg-warning/10 text-warning"
                            : "border-error bg-error/10 text-error"
                          : "border-glass-border bg-surface-2 text-text-secondary hover:border-primary/50"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-error text-body-small">{error}</p>}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!name || !markerPosition}
                isLoading={saving}
              >
                Ort hinzufügen
              </Button>
            </form>
          </Card>

          {/* Location list */}
          <Card variant="surface" padding="lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h3 text-text-primary">
                Vorhandene Orte ({locations.length})
              </h2>
              <label className="cursor-pointer">
                <Button variant="secondary" size="sm" isLoading={importing}>
                  JSON importieren
                </Button>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-xl">
                <p className="text-error text-body-small whitespace-pre-line">
                  {importError}
                </p>
              </div>
            )}

            {locations.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                Noch keine Orte vorhanden. Füge den ersten Ort hinzu!
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {locations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {location.name}
                      </p>
                      <Badge
                        variant={
                          location.difficulty === "easy"
                            ? "success"
                            : location.difficulty === "medium"
                            ? "warning"
                            : "error"
                        }
                        size="sm"
                      >
                        {location.difficulty === "easy"
                          ? "Einfach"
                          : location.difficulty === "medium"
                          ? "Mittel"
                          : "Schwer"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(location.id, location.name)}
                      className="text-error hover:text-error hover:bg-error/10"
                    >
                      Löschen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Ort löschen"
        message={`Möchtest du "${deleteModal.locationName}" wirklich löschen?`}
        onConfirm={handleDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
