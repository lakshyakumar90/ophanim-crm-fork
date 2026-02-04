"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Filter, X } from "lucide-react";
import { EmployeeDetailModal } from "@/components/hr/employee-detail-modal";
import { format } from "date-fns";

interface HREmployee {
  id: string;
  fullName: string;
  email: string;
  role: string;
  departmentId: string | null;
  departmentName: string | null;
  teamId: string | null;
  teamName: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// Helper to format job title for display
const formatJobTitle = (jobTitle: string | null | undefined): string => {
  if (!jobTitle) return "Other";
  return jobTitle.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function HREmployeesPage() {
  const [employees, setEmployees] = useState<HREmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Selected employee for detail modal
  const [selectedEmployee, setSelectedEmployee] = useState<HREmployee | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_URL}/hr/employees`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("crm_access_token")}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setEmployees(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    const departments = new Set<string>();
    const teams = new Set<string>();
    const roles = new Set<string>();

    employees.forEach((emp) => {
      if (emp.departmentName) departments.add(emp.departmentName);
      if (emp.teamName) teams.add(emp.teamName);
      if (emp.role) roles.add(emp.role);
    });

    return {
      departments: Array.from(departments).sort(),
      teams: Array.from(teams).sort(),
      roles: Array.from(roles).sort(),
    };
  }, [employees]);

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        search === "" ||
        emp.fullName.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.departmentName?.toLowerCase().includes(searchLower) ||
        emp.teamName?.toLowerCase().includes(searchLower) ||
        emp.jobTitle?.toLowerCase().includes(searchLower);

      // Department filter
      const matchesDepartment =
        departmentFilter === "all" ||
        (departmentFilter === "unassigned" && !emp.departmentName) ||
        emp.departmentName === departmentFilter;

      // Team filter
      const matchesTeam =
        teamFilter === "all" ||
        (teamFilter === "unassigned" && !emp.teamName) ||
        emp.teamName === teamFilter;

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && emp.isActive) ||
        (statusFilter === "inactive" && !emp.isActive);

      // Role filter
      const matchesRole = roleFilter === "all" || emp.role === roleFilter;

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesTeam &&
        matchesStatus &&
        matchesRole
      );
    });
  }, [
    employees,
    search,
    departmentFilter,
    teamFilter,
    statusFilter,
    roleFilter,
  ]);

  // Check if any filters are active
  const hasActiveFilters =
    departmentFilter !== "all" ||
    teamFilter !== "all" ||
    statusFilter !== "all" ||
    roleFilter !== "all";

  const clearFilters = () => {
    setDepartmentFilter("all");
    setTeamFilter("all");
    setStatusFilter("all");
    setRoleFilter("all");
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Role badge with colors matching admin users page
  const getRoleBadge = (emp: HREmployee) => {
    const role = emp.role;
    const deptName = emp.departmentName;

    if (role === "admin") {
      return <Badge variant="destructive">Admin</Badge>;
    }

    const roleLabel = role === "manager" ? "Manager" : "Employee";

    if (role === "manager") {
      return (
        <Badge variant="default" className="bg-blue-500">
          {roleLabel}
        </Badge>
      );
    }

    return <Badge variant="secondary">{roleLabel}</Badge>;
  };

  const handleRowClick = (employee: HREmployee) => {
    setSelectedEmployee(employee);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Employee Directory
          </h1>
          <p className="text-muted-foreground">
            View and manage all employees in the organization.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department, team, or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {filterOptions.departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Team Filter */}
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {filterOptions.teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {filterOptions.roles.map((role) => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-8 w-8" />
                    <p>No employees found</p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearFilters}
                        className="text-primary"
                      >
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(emp)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={emp.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(emp.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{emp.fullName}</div>
                        <div className="text-sm text-muted-foreground">
                          {emp.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(emp)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {emp.departmentName || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {emp.teamName || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatJobTitle(emp.jobTitle)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(emp.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={emp.isActive ? "default" : "secondary"}
                      className={
                        emp.isActive
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-gray-400"
                      }
                    >
                      {emp.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredEmployees.length} of {employees.length} employees
      </div>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal
        employee={selectedEmployee}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
