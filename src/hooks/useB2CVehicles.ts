import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchB2CVehicles } from "@/services/inventoryService";
import { Vehicle } from "@/types/inventory";

interface UseB2CVehiclesOptions {
  pageSize?: number;
  searchTerm?: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export const useB2CVehicles = ({
  pageSize = 100,
  searchTerm = "",
  sortField = "created_at",
  sortDirection = "desc"
}: UseB2CVehiclesOptions = {}) => {
  const [page, setPage] = useState(0);
  const [localSortField, setLocalSortField] = useState<string | null>(sortField);
  const [localSortDirection, setLocalSortDirection] = useState<"asc" | "desc">(sortDirection);

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ["b2cVehicles", searchTerm],
    queryFn: fetchB2CVehicles,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime)
    refetchOnWindowFocus: false,
  });

  // Client-side filtering and sorting for now (can move to server later)
  const filteredAndSorted = vehicles
    .filter(vehicle =>
      !searchTerm || 
      `${vehicle.brand} ${vehicle.model} ${vehicle.licenseNumber} ${vehicle.vin}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!localSortField) return 0;
      
      let aValue: any = a;
      let bValue: any = b;
      
      const fields = localSortField.split(".");
      for (const field of fields) {
        aValue = aValue?.[field];
        bValue = bValue?.[field];
      }
      
      if (aValue === undefined || bValue === undefined) return 0;
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return localSortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return localSortDirection === "asc" 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        return localSortDirection === "asc" 
          ? (aValue === bValue ? 0 : aValue ? 1 : -1)
          : (aValue === bValue ? 0 : bValue ? 1 : -1);
      }
      
      return 0;
    });

  const handleSort = (field: string) => {
    if (localSortField === field) {
      setLocalSortDirection(localSortDirection === "asc" ? "desc" : "asc");
    } else {
      setLocalSortField(field);
      setLocalSortDirection("asc");
    }
  };

  return {
    vehicles: filteredAndSorted,
    isLoading,
    error,
    sortField: localSortField,
    sortDirection: localSortDirection,
    onSort: handleSort,
    page,
    setPage,
    pageSize
  };
};
