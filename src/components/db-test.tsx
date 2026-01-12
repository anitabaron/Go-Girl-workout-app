"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../db/supabase.client";

interface TestNumRecord {
  id: number;
  created_at: string;
  num: number;
  letter: string;
}

export function DbTest() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TestNumRecord[]>([]);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [newNum, setNewNum] = useState<number>(6);
  const [newLetter, setNewLetter] = useState<string>("F");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNum, setEditNum] = useState<number>(0);
  const [editLetter, setEditLetter] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Próba połączenia z tabelą: "test-num"');

    try {
      const {
        data: records,
        error: queryError,
        count,
      } = await supabase
        .from("test-num")
        .select("id, created_at, num, letter", { count: "exact", head: false })
        .order("id", { ascending: true });

      if (queryError) {
        setError(`Błąd: ${queryError.message}`);
        setDebugInfo(
          `❌ Błąd przy zapytaniu do "test-num": ${queryError.message}`
        );
        setLoading(false);
        return false;
      }

      const recordCount = count ?? records?.length ?? 0;

      setData((records as TestNumRecord[]) || []);

      if (recordCount === 0 && records?.length === 0) {
        setDebugInfo(
          `⚠️ Zapytanie wykonane, ale 0 rekordów. Prawdopodobnie RLS blokuje dostęp do "test-num". Count: ${count}`
        );
      } else {
        setDebugInfo(
          `✅ Sukces! Znaleziono ${recordCount} rekord(ów) w tabeli "test-num"`
        );
      }

      setLoading(false);
      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Nieznany błąd";
      setError(`Błąd sieci: ${errorMessage}`);
      setDebugInfo(`❌ Błąd sieci: ${errorMessage}`);
      setLoading(false);
      return false;
    }
  }, []);

  const testWithRPC = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(
      "Funkcja RPC nie jest dostępna. Używam standardowego zapytania..."
    );
    setLoading(false);
    await fetchData();
  }, [fetchData]);

  const addRecord = useCallback(async () => {
    setError(null);
    setDebugInfo(`Dodawanie rekordu: num=${newNum}, letter=${newLetter}`);

    try {
      const { data: newRecord, error: insertError } = await supabase
        .from("test-num")
        .insert({ num: newNum, letter: newLetter })
        .select()
        .single();

      if (insertError) {
        setError(`Błąd dodawania: ${insertError.message}`);
        setDebugInfo(`❌ Błąd: ${insertError.message}`);
        return;
      }

      setDebugInfo(`✅ Dodano rekord ID: ${newRecord?.id}`);
      setNewNum((prev) => prev + 1);
      const currentCodePoint = newLetter.codePointAt(0) ?? 65;
      const nextCharCode = currentCodePoint + 1;
      setNewLetter(String.fromCodePoint(nextCharCode > 90 ? 65 : nextCharCode));
      await fetchData();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Nieznany błąd";
      setError(`Błąd: ${errorMessage}`);
      setDebugInfo(`❌ Błąd: ${errorMessage}`);
    }
  }, [newNum, newLetter, fetchData]);

  const updateRecord = useCallback(
    async (id: number) => {
      setError(null);
      setDebugInfo(`Aktualizowanie rekordu ID: ${id}`);

      try {
        const { error: updateError } = await supabase
          .from("test-num")
          .update({ num: editNum, letter: editLetter })
          .eq("id", id);

        if (updateError) {
          setError(`Błąd aktualizacji: ${updateError.message}`);
          setDebugInfo(`❌ Błąd: ${updateError.message}`);
          return;
        }

        setDebugInfo(`✅ Zaktualizowano rekord ID: ${id}`);
        setEditingId(null);
        await fetchData();
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Nieznany błąd";
        setError(`Błąd: ${errorMessage}`);
        setDebugInfo(`❌ Błąd: ${errorMessage}`);
      }
    },
    [editNum, editLetter, fetchData]
  );

  const deleteRecord = useCallback(
    async (id: number) => {
      setError(null);
      setDebugInfo(`Usuwanie rekordu ID: ${id}`);

      try {
        const { error: deleteError } = await supabase
          .from("test-num")
          .delete()
          .eq("id", id);

        if (deleteError) {
          setError(`Błąd usuwania: ${deleteError.message}`);
          setDebugInfo(`❌ Błąd: ${deleteError.message}`);
          return;
        }

        setDebugInfo(`✅ Usunięto rekord ID: ${id}`);
        await fetchData();
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "Nieznany błąd";
        setError(`Błąd: ${errorMessage}`);
        setDebugInfo(`❌ Błąd: ${errorMessage}`);
      }
    },
    [fetchData]
  );

  const startEdit = useCallback((record: TestNumRecord) => {
    setEditingId(record.id);
    setEditNum(record.num);
    setEditLetter(record.letter);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditNum(0);
    setEditLetter("");
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      setDebugInfo('Próba połączenia z tabelą: "test-num"');

      try {
        const {
          data: records,
          error: queryError,
          count,
        } = await supabase
          .from("test-num")
          .select("id, created_at, num, letter", {
            count: "exact",
            head: false,
          })
          .order("id", { ascending: true });

        if (cancelled) return;

        if (queryError) {
          setError(`Błąd: ${queryError.message}`);
          setDebugInfo(
            `❌ Błąd przy zapytaniu do "test-num": ${queryError.message}`
          );
          setLoading(false);
          return;
        }

        const recordCount = count ?? records?.length ?? 0;
        setData((records as TestNumRecord[]) || []);

        if (recordCount === 0 && records?.length === 0) {
          setDebugInfo(
            `⚠️ Zapytanie wykonane, ale 0 rekordów. Prawdopodobnie RLS blokuje dostęp do "test-num". Count: ${count}`
          );
        } else {
          setDebugInfo(
            `✅ Sukces! Znaleziono ${recordCount} rekord(ów) w tabeli "test-num"`
          );
        }

        setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        const errorMessage =
          err instanceof Error ? err.message : "Nieznany błąd";
        setError(`Błąd sieci: ${errorMessage}`);
        setDebugInfo(`❌ Błąd sieci: ${errorMessage}`);
        setLoading(false);
      }
    };

    void loadData();

    // Subskrypcja real-time
    const channel = supabase
      .channel("test-num-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test-num",
        },
        (payload) => {
          const recordId =
            (payload.new as TestNumRecord | null)?.id ||
            (payload.old as TestNumRecord | null)?.id ||
            "nieznany";
          setDebugInfo(
            `🔄 Real-time update: ${payload.eventType} na rekord ID: ${recordId}`
          );
          void loadData();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

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
        <button
          onClick={() => fetchData()}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Odśwież
        </button>
        <button
          onClick={testWithRPC}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
        >
          Test RPC
        </button>
      </div>

      {/* Formularz dodawania */}
      <div className="mb-4 p-3 bg-white border rounded-md">
        <h3 className="text-sm font-semibold mb-2">Dodaj nowy rekord:</h3>
        <div className="flex gap-2 items-end">
          <div>
            <label htmlFor="new-num" className="text-xs text-gray-600">
              Num:
            </label>
            <input
              id="new-num"
              type="number"
              value={newNum}
              onChange={(e) => setNewNum(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-letter" className="text-xs text-gray-600">
              Letter:
            </label>
            <input
              id="new-letter"
              type="text"
              value={newLetter}
              onChange={(e) => setNewLetter(e.target.value.toUpperCase())}
              maxLength={1}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
          </div>
          <button
            onClick={addRecord}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Dodaj
          </button>
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
                    <input
                      id={`edit-num-${record.id}`}
                      type="number"
                      value={editNum}
                      onChange={(e) => setEditNum(Number(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-letter-${record.id}`}
                      className="text-xs text-gray-600"
                    >
                      Letter:
                    </label>
                    <input
                      id={`edit-letter-${record.id}`}
                      type="text"
                      value={editLetter}
                      onChange={(e) =>
                        setEditLetter(e.target.value.toUpperCase())
                      }
                      maxLength={1}
                      className="w-20 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <button
                    onClick={() => updateRecord(record.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Zapisz
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Anuluj
                  </button>
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
                  <button
                    onClick={() => startEdit(record)}
                    className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                  >
                    Edytuj
                  </button>
                  <button
                    onClick={() => deleteRecord(record.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Usuń
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
