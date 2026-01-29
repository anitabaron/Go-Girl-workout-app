"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/db/supabase.client";

export interface TestNumRecord {
  id: number;
  created_at: string;
  num: number;
  letter: string;
}

export function useTestNumRecords() {
  const [data, setData] = useState<TestNumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState("");
  const [newNum, setNewNum] = useState(6);
  const [newLetter, setNewLetter] = useState("F");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNum, setEditNum] = useState(0);
  const [editLetter, setEditLetter] = useState("");

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
          `❌ Błąd przy zapytaniu do "test-num": ${queryError.message}`,
        );
        setLoading(false);
        return false;
      }

      const recordCount = count ?? records?.length ?? 0;
      setData((records as TestNumRecord[]) || []);

      if (recordCount === 0 && records?.length === 0) {
        setDebugInfo(
          `⚠️ Zapytanie wykonane, ale 0 rekordów. Prawdopodobnie RLS blokuje dostęp do "test-num". Count: ${count}`,
        );
      } else {
        setDebugInfo(
          `✅ Sukces! Znaleziono ${recordCount} rekord(ów) w tabeli "test-num"`,
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

  useEffect(() => {
    queueMicrotask(() => void fetchData());

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
            `🔄 Real-time update: ${payload.eventType} na rekord ID: ${recordId}`,
          );
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const addRecord = useCallback(async () => {
    setError(null);
    setDebugInfo(`Dodawanie rekordu: num=${newNum}, letter=${newLetter}`);

    try {
      const { data: created, error: insertError } = await supabase
        .from("test-num")
        .insert({ num: newNum, letter: newLetter })
        .select()
        .single();

      if (insertError) {
        setError(`Błąd dodawania: ${insertError.message}`);
        setDebugInfo(`❌ Błąd: ${insertError.message}`);
        return;
      }

      setDebugInfo(`✅ Dodano rekord ID: ${created?.id}`);
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
    [editNum, editLetter, fetchData],
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
    [fetchData],
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

  return {
    data,
    loading,
    error,
    debugInfo,
    setDebugInfo,
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
  };
}
