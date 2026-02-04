import api from "./api";
import type { Department, ApiResponse } from "@/types";

export const departmentsApi = {
  // Get all departments
  list: async (): Promise<Department[]> => {
    const response = await api.get<ApiResponse<Department[]>>("/departments");
    return response.data.success ? response.data.data : [];
  },

  // Get department by slug
  getBySlug: async (slug: string): Promise<Department | null> => {
    try {
      const response = await api.get<ApiResponse<Department>>(
        `/departments/slug/${slug}`,
      );
      return response.data.success ? response.data.data : null;
    } catch (error) {
      return null;
    }
  },

  // Get department by ID
  getById: async (id: string): Promise<Department | null> => {
    try {
      const response = await api.get<ApiResponse<Department>>(
        `/departments/${id}`,
      );
      return response.data.success ? response.data.data : null;
    } catch (error) {
      return null;
    }
  },

  // Create department (admin only)
  create: async (data: Partial<Department>): Promise<Department> => {
    const response = await api.post<ApiResponse<Department>>(
      "/departments",
      data,
    );
    return response.data.data;
  },

  // Update department (admin only)
  update: async (
    id: string,
    data: Partial<Department>,
  ): Promise<Department> => {
    const response = await api.put<ApiResponse<Department>>(
      `/departments/${id}`,
      data,
    );
    return response.data.data;
  },
};
