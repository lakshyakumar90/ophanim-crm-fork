"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const CHANNEL_NAME = "crm-polling";
const LEASE_KEY = "crm_polling_leader_lease_v1";
const PAYLOAD_KEY = "crm_polling_payload_v1";
const LEASE_TTL_MS = 15000;
const HEARTBEAT_MS = 5000;

type Lease = {
  tabId: string;
  expiresAt: number;
};

type InternalPayload = PollingPayload & {
  sourceTabId: string;
};

export type PollingPayload = {
  unreadCount?: number;
  remindersCount?: number;
  ts: number;
};

let tabIdSingleton: string | null = null;

function getTabId(): string {
  if (tabIdSingleton) return tabIdSingleton;

  if (typeof window === "undefined") {
    tabIdSingleton = "server";
    return tabIdSingleton;
  }

  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    tabIdSingleton = crypto.randomUUID();
  } else {
    tabIdSingleton = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  return tabIdSingleton;
}

function parseLease(raw: string | null): Lease | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Lease;
    if (!parsed.tabId || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLease(): Lease | null {
  if (typeof window === "undefined") return null;
  return parseLease(window.localStorage.getItem(LEASE_KEY));
}

function writeLease(tabId: string): void {
  if (typeof window === "undefined") return;
  const lease: Lease = { tabId, expiresAt: Date.now() + LEASE_TTL_MS };
  window.localStorage.setItem(LEASE_KEY, JSON.stringify(lease));
}

function parsePayload(raw: string | null): InternalPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as InternalPayload;
    if (!parsed || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function usePollingCoordinator(
  onMessage?: (payload: PollingPayload) => void,
): { isLeader: boolean; publish: (payload: Omit<PollingPayload, "ts">) => void } {
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const tabIdRef = useRef<string>(getTabId());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const emitIncoming = useCallback((payload: InternalPayload | null) => {
    if (!payload) return;
    if (typeof payload.ts !== "number") return;
    if (payload.sourceTabId === tabIdRef.current) return;

    onMessageRef.current?.({
      unreadCount: payload.unreadCount,
      remindersCount: payload.remindersCount,
      ts: payload.ts,
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const tabId = tabIdRef.current;

    const electLeader = () => {
      const now = Date.now();
      const currentLease = readLease();
      const canBecomeLeader =
        !currentLease ||
        currentLease.expiresAt <= now ||
        currentLease.tabId === tabId;

      if (canBecomeLeader) {
        writeLease(tabId);
        setIsLeader(true);
      } else {
        setIsLeader(false);
      }
    };

    electLeader();

    const heartbeat = window.setInterval(() => {
      const currentLease = readLease();
      if (currentLease?.tabId === tabId) {
        writeLease(tabId);
        setIsLeader(true);
      } else {
        electLeader();
      }
    }, HEARTBEAT_MS);

    const onStorage = (event: StorageEvent) => {
      if (event.key === LEASE_KEY) {
        electLeader();
        return;
      }
      if (event.key === PAYLOAD_KEY) {
        emitIncoming(parsePayload(event.newValue));
      }
    };

    const onUnload = () => {
      const currentLease = readLease();
      if (currentLease?.tabId === tabId) {
        window.localStorage.removeItem(LEASE_KEY);
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", electLeader);
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", electLeader);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", electLeader);
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", electLeader);
    };
  }, [emitIncoming]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof BroadcastChannel === "undefined") return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<InternalPayload>) => {
      emitIncoming(event.data);
    };

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, [emitIncoming]);

  const publish = useCallback(
    (payload: Omit<PollingPayload, "ts">) => {
      if (typeof window === "undefined" || !isLeader) return;

      const outbound: InternalPayload = {
        ...payload,
        ts: Date.now(),
        sourceTabId: tabIdRef.current,
      };

      if (channelRef.current) {
        channelRef.current.postMessage(outbound);
      }

      window.localStorage.setItem(PAYLOAD_KEY, JSON.stringify(outbound));
    },
    [isLeader],
  );

  return { isLeader, publish };
}
