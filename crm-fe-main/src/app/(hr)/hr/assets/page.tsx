"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Laptop, Pencil, Plus, RotateCcw, UserPlus } from "lucide-react";
import { assetsApi } from "@/lib/api";
import { useAuth, useIsAdmin } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useHeaderRefresh } from "@/hooks/layout/useHeaderRefresh";
import { AssetModal } from "@/components/hr/assets/AssetModal";
import { AssignAssetModal } from "@/components/hr/assets/AssignAssetModal";
import { toast } from "sonner";
import { toastHrError } from "@/lib/hr-error-toast";
import { ListPageLayout } from "@/components/shared/list-page-layout";

type AssetRow = {
  id: string;
  name: string;
  category?: string | null;
  serial_number?: string | null;
  status?: string | null;
  notes?: string | null;
};

export default function AssetsPage() {
  const { user, can } = useAuth();
  const isAdmin = useIsAdmin();
  const canManage = can("assets:manage") || isAdmin;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AssetRow | null>(null);
  const [assignAsset, setAssignAsset] = useState<AssetRow | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR(
    user ? ["hr-assets"] : null,
    () => assetsApi.list({ limit: 50 }),
  );

  const assets: AssetRow[] = Array.isArray(data) ? data : (data as any)?.data ?? [];

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [mutate]);

  useHeaderRefresh({ onRefresh: handleRefresh, isRefreshing, enabled: Boolean(user) });

  const handleReturn = async (asset: AssetRow) => {
    setReturningId(asset.id);
    try {
      await assetsApi.return(asset.id);
      toast.success("Asset returned");
      await mutate();
    } catch (e) {
      toastHrError(e, "Failed to return asset");
    } finally {
      setReturningId(null);
    }
  };

  return (
    <ListPageLayout
      title="Assets"
      description="Company equipment and asset assignments"
      icon={<Laptop className="h-4 w-4 text-primary" />}
      breadcrumbs={[
        { label: "HR", href: "/hr" },
        { label: "Assets" },
      ]}
      actions={
        canManage ? (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Add asset
          </Button>
        ) : undefined
      }
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canManage ? 5 : 4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 5 : 4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.category ?? "—"}</TableCell>
                  <TableCell>{a.serial_number ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {a.status ?? "available"}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditAsset(a)}
                          aria-label="Edit asset"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {a.status !== "assigned" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAssignAsset(a)}
                            aria-label="Assign asset"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={returningId === a.id}
                            onClick={() => void handleReturn(a)}
                            aria-label="Return asset"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => {
          await mutate();
        }}
      />
      <AssetModal
        open={Boolean(editAsset)}
        onOpenChange={(open) => {
          if (!open) setEditAsset(null);
        }}
        asset={editAsset}
        onSaved={async () => {
          await mutate();
          setEditAsset(null);
        }}
      />
      {assignAsset ? (
        <AssignAssetModal
          open={Boolean(assignAsset)}
          onOpenChange={(open) => {
            if (!open) setAssignAsset(null);
          }}
          assetId={assignAsset.id}
          assetName={assignAsset.name}
          onAssigned={async () => {
            await mutate();
            setAssignAsset(null);
          }}
        />
      ) : null}
    </ListPageLayout>
  );
}
