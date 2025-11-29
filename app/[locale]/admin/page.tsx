"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import SwitzerlandMap from "@/components/Map";
import ConfirmModal from "@/components/ConfirmModal";

interface Group {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
  memberCount: number;
  gameCount: number;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  hintEnabled: boolean | null;
  createdAt: string;
  groupCount: number;
  guessCount: number;
}

interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  difficulty: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const [activeTab, setActiveTab] = useState<"groups" | "users" | "locations">("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Location form state
  const [locationName, setLocationName] = useState("");
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
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
    fetchData();
  }, [session, status, isSuperAdmin, router, locale]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupsRes, usersRes, locationsRes] = await Promise.all([
        fetch("/api/admin/groups"),
        fetch("/api/admin/users"),
        fetch("/api/locations"),
      ]);

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Gruppe "${groupName}" wirklich löschen? Alle Spiele, Runden und Guesses werden ebenfalls gelöscht!`)) {
      return;
    }

    setDeleting(groupId);
    try {
      const response = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });

      if (response.ok) {
        toast.success("Gruppe gelöscht");
        setGroups(groups.filter((g) => g.id !== groupId));
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string | null) => {
    if (!confirm(`User "${userName || 'Unbenannt'}" wirklich löschen? Alle Guesses und Gruppenmitgliedschaften werden ebenfalls gelöscht!`)) {
      return;
    }

    setDeleting(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("User gelöscht");
        setUsers(users.filter((u) => u.id !== userId));
      } else {
        const data = await response.json();
        toast.error(data.error || "Fehler beim Löschen");
      }
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleHint = async (userId: string, currentState: boolean | null) => {
    const newState = !currentState;
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, hintEnabled: newState }),
      });

      if (response.ok) {
        toast.success(newState ? "Hilfskreis aktiviert" : "Hilfskreis deaktiviert");
        setUsers(users.map((u) =>
          u.id === userId ? { ...u, hintEnabled: newState } : u
        ));
      } else {
        toast.error("Fehler beim Ändern");
      }
    } catch {
      toast.error("Fehler beim Ändern");
    }
  };

  // Location handlers
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markerPosition) {
      setLocationError("Bitte setze einen Marker auf der Karte");
      return;
    }

    setSavingLocation(true);
    setLocationError("");

    try {
      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: locationName,
          latitude: markerPosition.lat,
          longitude: markerPosition.lng,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create location");
      }

      toast.success("Ort hinzugefügt");
      setLocationName("");
      setMarkerPosition(null);
      setDifficulty("medium");

      // Refresh locations
      const locationsRes = await fetch("/api/locations");
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data);
      }
    } catch {
      setLocationError("Fehler beim Speichern des Ortes");
    } finally {
      setSavingLocation(false);
    }
  };

  const openDeleteLocationModal = (locationId: string, name: string) => {
    setDeleteModal({ isOpen: true, locationId, locationName: name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, locationId: null, locationName: "" });
  };

  const handleDeleteLocation = async () => {
    if (!deleteModal.locationId) return;

    try {
      const response = await fetch(
        `/api/locations?id=${deleteModal.locationId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Ort gelöscht");
        setLocations(locations.filter((l) => l.id !== deleteModal.locationId));
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch {
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
        body: JSON.stringify({ locations: data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.details?.join("\n") || result.error || "Import fehlgeschlagen"
        );
      }

      toast.success(`${result.imported} Orte erfolgreich importiert!`);

      // Refresh locations
      const locationsRes = await fetch("/api/locations");
      if (locationsRes.ok) {
        const locData = await locationsRes.json();
        setLocations(locData);
      }
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Fehler beim Import"
      );
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const difficultyOptions = [
    { value: "easy", label: "Einfach" },
    { value: "medium", label: "Mittel" },
    { value: "hard", label: "Schwer" },
  ];

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

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-surface-2 border border-glass-border w-fit">
          <button
            onClick={() => setActiveTab("groups")}
            className={cn(
              "px-4 py-2 rounded-md font-medium transition-all duration-200",
              activeTab === "groups"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            Gruppen ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "px-4 py-2 rounded-md font-medium transition-all duration-200",
              activeTab === "users"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            User ({users.length})
          </button>
          <button
            onClick={() => setActiveTab("locations")}
            className={cn(
              "px-4 py-2 rounded-md font-medium transition-all duration-200",
              activeTab === "locations"
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            Orte ({locations.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === "groups" && (
          <Card variant="surface" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2 border-b border-glass-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-caption font-medium text-text-secondary">Name</th>
                    <th className="text-left px-6 py-3 text-caption font-medium text-text-secondary">Invite Code</th>
                    <th className="text-center px-6 py-3 text-caption font-medium text-text-secondary">Mitglieder</th>
                    <th className="text-center px-6 py-3 text-caption font-medium text-text-secondary">Spiele</th>
                    <th className="text-right px-6 py-3 text-caption font-medium text-text-secondary">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {groups.map((group) => (
                    <tr key={group.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/${locale}/groups/${group.id}`}
                          className="font-medium text-text-primary hover:text-primary transition-colors"
                        >
                          {group.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-text-muted font-mono text-sm">
                        {group.inviteCode}
                      </td>
                      <td className="px-6 py-4 text-center text-text-secondary">
                        {group.memberCount}
                      </td>
                      <td className="px-6 py-4 text-center text-text-secondary">
                        {group.gameCount}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          disabled={deleting === group.id}
                          isLoading={deleting === group.id}
                        >
                          Löschen
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {groups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                        Keine Gruppen vorhanden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "users" && (
          <Card variant="surface" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-2 border-b border-glass-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-caption font-medium text-text-secondary">User</th>
                    <th className="text-left px-6 py-3 text-caption font-medium text-text-secondary">Email</th>
                    <th className="text-center px-6 py-3 text-caption font-medium text-text-secondary">Gruppen</th>
                    <th className="text-center px-6 py-3 text-caption font-medium text-text-secondary">Guesses</th>
                    <th className="text-center px-6 py-3 text-caption font-medium text-text-secondary">Hilfskreis</th>
                    <th className="text-right px-6 py-3 text-caption font-medium text-text-secondary">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.image} name={user.name} size="sm" />
                          <span className="font-medium text-text-primary">
                            {user.name || "Unbenannt"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-muted text-sm">
                        {user.email}
                        {user.email === "michi.mauch@netnode.ch" && (
                          <Badge variant="error" size="sm" className="ml-2">
                            Admin
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-text-secondary">
                        {user.groupCount}
                      </td>
                      <td className="px-6 py-4 text-center text-text-secondary">
                        {user.guessCount}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleHint(user.id, user.hintEnabled)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-sm font-medium transition-colors",
                            user.hintEnabled
                              ? "bg-primary/20 text-primary hover:bg-primary/30"
                              : "bg-surface-3 text-text-muted hover:bg-surface-2"
                          )}
                        >
                          {user.hintEnabled ? "An" : "Aus"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.email !== "michi.mauch@netnode.ch" ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            disabled={deleting === user.id}
                            isLoading={deleting === user.id}
                          >
                            Löschen
                          </Button>
                        ) : (
                          <span className="text-text-muted text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                        Keine User vorhanden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "locations" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Add new location */}
            <Card variant="surface" padding="lg">
              <h2 className="text-h3 text-text-primary mb-6">Neuen Ort hinzufügen</h2>
              <form onSubmit={handleAddLocation} className="space-y-6">
                <Input
                  label="Ortsname"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
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

                {locationError && <p className="text-error text-body-small">{locationError}</p>}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!locationName || !markerPosition}
                  isLoading={savingLocation}
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
                        onClick={() => openDeleteLocationModal(location.id, location.name)}
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
        )}
      </main>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Ort löschen"
        message={`Möchtest du "${deleteModal.locationName}" wirklich löschen?`}
        onConfirm={handleDeleteLocation}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}
