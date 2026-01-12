"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../db/src/db/supabase.client";

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

  const fetchData = useCallback(async (tableName: string) => {
    setLoading(true);
    setError(null);
    setDebugInfo(`Próba połączenia z tabelą: "${tableName}"`);

    try {
      // Spróbuj z count, żeby zobaczyć czy to RLS
      const {
        data: records,
        error: queryError,
        count,
      } = await supabase
        .from(tableName)
        .select("id, created_at, num, letter", { count: "exact", head: false });

      if (queryError) {
        setError(`Błąd: ${queryError.message}`);
        setDebugInfo(
          `❌ Błąd przy zapytaniu do "${tableName}": ${queryError.message}`
        );
        setLoading(false);
        return false;
      }

      const recordCount = count ?? records?.length ?? 0;

      setData((records as TestNumRecord[]) || []);

      if (recordCount === 0 && records?.length === 0) {
        setDebugInfo(
          `⚠️ Zapytanie wykonane, ale 0 rekordów. Prawdopodobnie RLS blokuje dostęp do "${tableName}". Count: ${count}`
        );
      } else {
        setDebugInfo(
          `✅ Sukces! Znaleziono ${recordCount} rekord(ów) w tabeli "${tableName}"`
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
    setDebugInfo("Próba z użyciem RPC (surowe SQL)...");

    try {
      // Spróbuj użyć RPC do wykonania surowego zapytania SQL
      // To może ominąć niektóre ograniczenia RLS (ale tylko jeśli masz funkcję)
      const { data, error } = await supabase.rpc("exec_sql", {
        query: 'SELECT id, created_at, num FROM "test-num" LIMIT 10',
      });

      if (error) {
        // RPC może nie być dostępne, to normalne
        setDebugInfo(
          `RPC nie dostępne (to normalne): ${error.message}. Użyj standardowego zapytania.`
        );
        setLoading(false);
        return;
      }

      setData((data as TestNumRecord[]) || []);
      setDebugInfo(`✅ RPC działa! Znaleziono ${data?.length || 0} rekordów`);
      setLoading(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Nieznany błąd";
      setDebugInfo(`RPC nie dostępne: ${errorMessage}`);
      setLoading(false);
    }
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
          });

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

    return () => {
      cancelled = true;
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
          onClick={() => fetchData("test-num")}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Odśwież (test-num)
        </button>
        <button
          onClick={testWithRPC}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
        >
          Test RPC
        </button>
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
            <div className="grid grid-cols-4 gap-4 text-sm">
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
              <div>
                <span className="font-semibold text-gray-700">Letter:</span>{" "}
                <span className="text-gray-900">{record.letter}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
