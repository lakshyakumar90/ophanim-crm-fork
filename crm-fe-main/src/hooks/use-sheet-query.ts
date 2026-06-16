"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Sync a right-side sheet with URL search params (e.g. ?create=1, ?id=uuid, ?edit=uuid). */
export function useSheetQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createOpen = searchParams.get("create") === "1";
  const selectedId = searchParams.get("id");
  const editId = searchParams.get("edit");

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openCreate = useCallback(() => {
    replaceParams((p) => {
      p.set("create", "1");
      p.delete("id");
      p.delete("edit");
    });
  }, [replaceParams]);

  const closeCreate = useCallback(() => {
    replaceParams((p) => {
      p.delete("create");
    });
  }, [replaceParams]);

  const openDetail = useCallback(
    (id: string) => {
      replaceParams((p) => {
        p.set("id", id);
        p.delete("create");
        p.delete("edit");
      });
    },
    [replaceParams],
  );

  const closeDetail = useCallback(() => {
    replaceParams((p) => {
      p.delete("id");
    });
  }, [replaceParams]);

  const openEdit = useCallback(
    (id: string) => {
      replaceParams((p) => {
        p.set("edit", id);
        p.delete("create");
        p.delete("id");
      });
    },
    [replaceParams],
  );

  const closeEdit = useCallback(() => {
    replaceParams((p) => {
      p.delete("edit");
    });
  }, [replaceParams]);

  const closeAll = useCallback(() => {
    replaceParams((p) => {
      p.delete("create");
      p.delete("id");
      p.delete("edit");
    });
  }, [replaceParams]);

  return useMemo(
    () => ({
      createOpen,
      selectedId,
      editId,
      openCreate,
      closeCreate,
      openDetail,
      closeDetail,
      openEdit,
      closeEdit,
      closeAll,
    }),
    [
      createOpen,
      selectedId,
      editId,
      openCreate,
      closeCreate,
      openDetail,
      closeDetail,
      openEdit,
      closeEdit,
      closeAll,
    ],
  );
}
