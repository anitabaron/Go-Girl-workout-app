"use client";

import { useTestNumRecords } from "@/hooks/use-test-num-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Komponent deweloperski do testowania połączenia z Supabase (tabela test-num).
 * @deprecated Używaj tylko do celów deweloperskich. Nie jest renderowany w aplikacji.
 */
export function DbTest() {
  const {
    data,
    loading,
    error,
    debugInfo,
    fetchData,
    newNum,
    setNewNum,
    newLetter,
    setNewLetter,
    editingId,
    editNum,
    setEditNum,
    editLetter,
    setEditLetter,
    addRecord,
    updateRecord,
    deleteRecord,
    startEdit,
    cancelEdit,
  } = useTestNumRecords();

  const testWithRPC = () => {
    void fetchData();
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <p className="text-gray-600">Łączenie z bazą danych...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 rounded-lg bg-red-50">
        <p className="text-red-600 font-semibold">Błąd połączenia:</p>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-green-50">
      <h2 className="text-lg font-semibold mb-3 text-green-800">
        ✅ Połączenie z Supabase działa!
      </h2>

      {debugInfo && (
        <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          <strong>Debug:</strong> {debugInfo}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => fetchData()} variant="secondary" size="sm">
          Odśwież
        </Button>
        <Button onClick={testWithRPC} variant="secondary" size="sm">
          Test RPC
        </Button>
      </div>

      <div className="mb-4 p-3 bg-white border rounded-md">
        <h3 className="text-sm font-semibold mb-2">Dodaj nowy rekord:</h3>
        <div className="flex gap-2 items-end">
          <div>
            <label htmlFor="new-num" className="text-xs text-gray-600">
              Num:
            </label>
            <Input
              id="new-num"
              type="number"
              value={newNum}
              onChange={(e) => setNewNum(Number(e.target.value))}
              className="w-20"
            />
          </div>
          <div>
            <label htmlFor="new-letter" className="text-xs text-gray-600">
              Letter:
            </label>
            <Input
              id="new-letter"
              type="text"
              value={newLetter}
              onChange={(e) => setNewLetter(e.target.value.toUpperCase())}
              maxLength={1}
              className="w-20"
            />
          </div>
          <Button onClick={addRecord} size="sm">
            Dodaj
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Znaleziono {data.length} rekord(ów):
      </p>
      <div className="space-y-2">
        {data.map((record) => (
          <div
            key={record.id}
            className="p-3 bg-white border rounded-md shadow-sm"
          >
            {editingId === record.id ? (
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div>
                    <label
                      htmlFor={`edit-num-${record.id}`}
                      className="text-xs text-gray-600"
                    >
                      Num:
                    </label>
                    <Input
                      id={`edit-num-${record.id}`}
                      type="number"
                      value={editNum}
                      onChange={(e) => setEditNum(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-letter-${record.id}`}
                      className="text-xs text-gray-600"
                    >
                      Letter:
                    </label>
                    <Input
                      id={`edit-letter-${record.id}`}
                      type="text"
                      value={editLetter}
                      onChange={(e) =>
                        setEditLetter(e.target.value.toUpperCase())
                      }
                      maxLength={1}
                      className="w-20"
                    />
                  </div>
                  <Button
                    onClick={() => updateRecord(record.id)}
                    variant="secondary"
                    size="sm"
                  >
                    Zapisz
                  </Button>
                  <Button onClick={cancelEdit} variant="outline" size="sm">
                    Anuluj
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 text-sm items-center">
                <div>
                  <span className="font-semibold text-gray-700">ID:</span>{" "}
                  <span className="text-gray-900">{record.id}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Num:</span>{" "}
                  <span className="text-gray-900">{record.num}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Created:</span>{" "}
                  <span className="text-gray-900">
                    {new Date(record.created_at).toLocaleString("pl-PL")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div>
                    <span className="font-semibold text-gray-700">Letter:</span>{" "}
                    <span className="text-gray-900">{record.letter}</span>
                  </div>
                  <Button
                    onClick={() => startEdit(record)}
                    variant="secondary"
                    size="sm"
                  >
                    Edytuj
                  </Button>
                  <Button
                    onClick={() => deleteRecord(record.id)}
                    variant="destructive"
                    size="sm"
                  >
                    Usuń
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
