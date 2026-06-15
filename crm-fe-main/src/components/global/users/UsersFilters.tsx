import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_TITLES } from "./users.constants";

type UsersFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  jobTitleFilter: string;
  onJobTitleFilterChange: (value: string) => void;
};

export function UsersFilters({
  search,
  onSearchChange,
  jobTitleFilter,
  onJobTitleFilterChange,
}: UsersFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={jobTitleFilter} onValueChange={onJobTitleFilterChange}>
        <SelectTrigger className="w-45">
          <SelectValue placeholder="Filter by job title" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Job Titles</SelectItem>
          {JOB_TITLES.map((jt) => (
            <SelectItem key={jt.value} value={jt.value}>
              {jt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
