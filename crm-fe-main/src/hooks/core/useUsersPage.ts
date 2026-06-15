import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { usersApi, teamsApi } from "@/lib/api";
import { useIsAdmin } from "@/providers/auth-provider";
import { useDepartment } from "@/providers/department-context";
import { useHeaderRefresh } from "@/hooks/use-header-refresh";
import type { EmployeeBulkUpdate } from "@/components/hr/employees/BulkEditTable";
import { toast } from "sonner";

export function useUsersPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const { currentDepartment } = useDepartment();
  const [search, setSearch] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const bulkEditRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, mutate } = useSWR(
    isAdmin ? ["users", search, currentDepartment?.id, jobTitleFilter] : null,
    () =>
      usersApi.list({
        page: 1,
        limit: 5000,
        search: search || undefined,
        departmentId: currentDepartment?.id,
        jobTitle: jobTitleFilter && jobTitleFilter !== "all" ? jobTitleFilter : undefined,
      }),
  );

  const { data: teamsData } = useSWR("users-page-teams", () => teamsApi.list());

  const refreshUsersData = useCallback(async () => {
    await mutate();
  }, [mutate]);

  useHeaderRefresh({
    onRefresh: refreshUsersData,
    enabled: isAdmin,
  });

  const users = data?.data || [];
  const teams = Array.isArray(teamsData) ? teamsData : [];

  const selectedUsers = useMemo(
    () => users.filter((u: { id: string }) => selectedIds.includes(u.id)),
    [users, selectedIds],
  );

  const managerOptions = useMemo(
    () => users.filter((u: { role: string }) => u.role === "manager" || u.role === "admin"),
    [users],
  );

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Map(
          users
            .filter((u: { departmentId?: string; departmentName?: string }) => u.departmentId && u.departmentName)
            .map((u: { departmentId: string; departmentName: string }) => [
              u.departmentId,
              u.departmentName,
            ]),
        ).entries(),
      ),
    [users],
  );

  useEffect(() => {
    if (bulkEditMode && bulkEditRef.current) {
      bulkEditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bulkEditMode]);

  const allChecked = users.length > 0 && users.every((u: { id: string }) => selectedIds.includes(u.id));

  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelectedIds((prev) => prev.filter((id) => !users.some((u: { id: string }) => u.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...users.map((u: { id: string }) => u.id)])));
  }, [allChecked, users]);

  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const saveBulkUsers = useCallback(
    async (updates: EmployeeBulkUpdate[]) => {
      if (updates.length === 0) return;

      setBulkSaving(true);
      try {
        const response = await usersApi.bulkUpdate(
          updates as Array<{ id: string; data: Record<string, unknown> }>,
        );
        const result = response?.data?.data;
        const failed = Array.isArray(result?.failed) ? result.failed.length : 0;
        const succeeded = Array.isArray(result?.succeeded)
          ? result.succeeded.length
          : updates.length - failed;

        if (succeeded > 0) toast.success(`${succeeded} users updated`);
        if (failed > 0) toast.error(`${failed} users failed to update`);

        if (failed === 0) {
          setBulkEditMode(false);
          setSelectedIds([]);
        }

        await mutate();
      } catch {
        toast.error("Bulk update failed");
      } finally {
        setBulkSaving(false);
      }
    },
    [mutate],
  );

  const scrollToBulkTable = useCallback(() => {
    if (!bulkEditRef.current) return;
    bulkEditRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openBulkEdit = useCallback(() => {
    setBulkEditMode(true);
    setTimeout(scrollToBulkTable, 80);
  }, [scrollToBulkTable]);

  const goToAddUser = useCallback(() => {
    router.push("/global/new");
  }, [router]);

  const goToUserDetails = useCallback(
    (userId: string) => {
      router.push(`/global/users/${userId}`);
    },
    [router],
  );

  const goToEditUser = useCallback(
    (userId: string) => {
      router.push(`/global/users/${userId}/edit`);
    },
    [router],
  );

  return {
    isAdmin,
    search,
    setSearch,
    jobTitleFilter,
    setJobTitleFilter,
    selectedIds,
    setSelectedIds,
    bulkEditMode,
    setBulkEditMode,
    bulkSaving,
    bulkEditRef,
    users,
    teams,
    isLoading,
    selectedUsers,
    managerOptions,
    departmentOptions,
    allChecked,
    toggleAll,
    toggleSelect,
    saveBulkUsers,
    scrollToBulkTable,
    openBulkEdit,
    goToAddUser,
    goToUserDetails,
    goToEditUser,
  };
}
