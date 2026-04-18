import { useEffect, useRef, useState } from "preact/hooks";

export type AsyncState<T> =
  | { status: "idle"; data: null }
  | { status: "loading"; data: T | null }
  | { status: "success"; data: T; refreshedAt: number }
  | { status: "error"; error: Error; data: T | null };

export interface AsyncOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Small polling hook. Intentionally minimal. Runs once on mount and every
 * `intervalMs` ms after. Does not retry on error; next interval tick naturally
 * re-attempts.
 */
export function useAsync<T>(
  task: () => Promise<T>,
  deps: unknown[],
  options: AsyncOptions = {},
): AsyncState<T> & { reload: () => void } {
  const { intervalMs, enabled = true } = options;
  const [state, setState] = useState<AsyncState<T>>({ status: "idle", data: null });
  const mountedRef = useRef(true);
  const dataRef = useRef<T | null>(null);
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      setState((prev) => ({
        status: "loading",
        data: prev.status === "success" ? prev.data : dataRef.current,
      }));
      try {
        const result = await taskRef.current();
        if (cancelled || !mountedRef.current) return;
        dataRef.current = result;
        setState({ status: "success", data: result, refreshedAt: Date.now() });
      } catch (err) {
        if (cancelled || !mountedRef.current) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({
          status: "error",
          error,
          data: prev.status === "success" ? prev.data : dataRef.current,
        }));
      } finally {
        if (!cancelled && intervalMs && intervalMs > 0) {
          timer = setTimeout(run, intervalMs);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, ...deps]);

  const reload = () => {
    void (async () => {
      setState((prev) => ({
        status: "loading",
        data: prev.status === "success" ? prev.data : dataRef.current,
      }));
      try {
        const result = await taskRef.current();
        if (!mountedRef.current) return;
        dataRef.current = result;
        setState({ status: "success", data: result, refreshedAt: Date.now() });
      } catch (err) {
        if (!mountedRef.current) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setState((prev) => ({
          status: "error",
          error,
          data: prev.status === "success" ? prev.data : dataRef.current,
        }));
      }
    })();
  };

  return { ...state, reload };
}
