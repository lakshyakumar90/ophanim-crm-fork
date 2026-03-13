"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type RefreshHandler = () => Promise<void> | void;

type RefreshRegistration = {
  id: symbol;
  refresh: RefreshHandler;
  enabled: boolean;
  isRefreshing?: boolean;
};

type HeaderRefreshContextValue = {
  registerRefreshHandler: (
    refresh: RefreshHandler,
    options?: {
      enabled?: boolean;
      isRefreshing?: boolean;
    },
  ) => symbol;
  updateRefreshHandler: (
    id: symbol,
    refresh: RefreshHandler,
    options?: {
      enabled?: boolean;
      isRefreshing?: boolean;
    },
  ) => void;
  clearRefreshHandler: (id: symbol) => void;
  enabled: boolean;
  isRefreshing: boolean;
  triggerRefresh: () => Promise<void>;
};

const HeaderRefreshContext = createContext<HeaderRefreshContextValue | null>(null);

export function HeaderRefreshProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] = useState<RefreshRegistration | null>(null);
  const [isTriggerRefreshing, setIsTriggerRefreshing] = useState(false);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const registerRefreshHandler = useCallback<
    HeaderRefreshContextValue["registerRefreshHandler"]
  >((refresh, options) => {
    const id = Symbol("header-refresh-handler");

    setRegistration({
      id,
      refresh,
      enabled: options?.enabled ?? true,
      isRefreshing: options?.isRefreshing,
    });

    return id;
  }, []);

  const updateRefreshHandler = useCallback<
    HeaderRefreshContextValue["updateRefreshHandler"]
  >((id, refresh, options) => {
    setRegistration((current) => {
      if (!current || current.id !== id) {
        return current;
      }

      const newEnabled = options?.enabled ?? true;
      const newIsRefreshing = options?.isRefreshing;

      if (
        current.refresh === refresh &&
        current.enabled === newEnabled &&
        current.isRefreshing === newIsRefreshing
      ) {
        return current;
      }

      return {
        id,
        refresh,
        enabled: newEnabled,
        isRefreshing: newIsRefreshing,
      };
    });
  }, []);

  const clearRefreshHandler = useCallback<
    HeaderRefreshContextValue["clearRefreshHandler"]
  >((id) => {
    setRegistration((current) => {
      if (!current || current.id !== id) {
        return current;
      }

      return null;
    });
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (!registration?.enabled || inFlightRef.current) {
      return inFlightRef.current ?? Promise.resolve();
    }

    setIsTriggerRefreshing(true);
    const pending = Promise.resolve(registration.refresh()).finally(() => {
      if (inFlightRef.current === pending) {
        inFlightRef.current = null;
      }
      setIsTriggerRefreshing(false);
    });

    inFlightRef.current = pending;
    await pending;
  }, [registration]);

  const value = useMemo<HeaderRefreshContextValue>(
    () => ({
      registerRefreshHandler,
      updateRefreshHandler,
      clearRefreshHandler,
      enabled: registration?.enabled ?? false,
      isRefreshing: Boolean(registration?.isRefreshing) || isTriggerRefreshing,
      triggerRefresh,
    }),
    [
      clearRefreshHandler,
      isTriggerRefreshing,
      registerRefreshHandler,
      registration?.enabled,
      registration?.isRefreshing,
      triggerRefresh,
      updateRefreshHandler,
    ],
  );

  return (
    <HeaderRefreshContext.Provider value={value}>
      {children}
    </HeaderRefreshContext.Provider>
  );
}

export function useHeaderRefreshController() {
  const context = useContext(HeaderRefreshContext);

  if (!context) {
    throw new Error(
      "useHeaderRefreshController must be used within a HeaderRefreshProvider",
    );
  }

  return context;
}

export function useHeaderRefresh(options: {
  onRefresh: RefreshHandler;
  enabled?: boolean;
  isRefreshing?: boolean;
}) {
  const { clearRefreshHandler, registerRefreshHandler, updateRefreshHandler } =
    useHeaderRefreshController();
  const registrationIdRef = useRef<symbol | null>(null);
  const { enabled = true, isRefreshing, onRefresh } = options;

  // Keep the latest onRefresh in a ref so its identity change doesn't
  // need to be a useEffect dependency (avoids infinite re-render loops
  // when callers pass an inline or useCallback-derived function that
  // recreates every render due to unstable deps like array keys).
  const onRefreshRef = useRef<RefreshHandler>(onRefresh);
  onRefreshRef.current = onRefresh;

  // Stable wrapper — never changes identity, always delegates to the ref.
  const stableRefresh = useCallback<RefreshHandler>(() => onRefreshRef.current(), []);

  useEffect(() => {
    if (!registrationIdRef.current) {
      registrationIdRef.current = registerRefreshHandler(stableRefresh, {
        enabled,
        isRefreshing,
      });
      return;
    }

    updateRefreshHandler(registrationIdRef.current, stableRefresh, {
      enabled,
      isRefreshing,
    });
  }, [
    enabled,
    isRefreshing,
    stableRefresh,
    registerRefreshHandler,
    updateRefreshHandler,
  ]);

  useEffect(() => {
    return () => {
      if (registrationIdRef.current) {
        clearRefreshHandler(registrationIdRef.current);
        registrationIdRef.current = null;
      }
    };
  }, [clearRefreshHandler]);
}
