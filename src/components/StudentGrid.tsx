import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Users, Database, Clock, Search, Filter, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentCard from "./StudentCard";

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
  seat: string;
}

interface StudentsData {
  students: Student[];
  lastUpdated: string;
}

const StudentGrid = () => {
  const [studentsData, setStudentsData] = useState<StudentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [sortFilter, setSortFilter] = useState("all");
  const { toast } = useToast();

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-students');
      
      if (error) throw error;
      
      setStudentsData(data);
      setLastRefresh(new Date());
      
      toast({
        title: "Data Synchronized",
        description: `Retrieved ${data.students?.length || 0} student records`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Sync Failed",
        description: "Unable to retrieve student data. Check connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    fetchStudents();
  };

  const handleVerificationComplete = () => {
    // Refresh data after verification to get updated status
    setTimeout(() => {
      fetchStudents();
    }, 1000);
  };

  // Auto-refresh every 3 minutes
  useEffect(() => {
    fetchStudents();
    
    const interval = setInterval(() => {
      fetchStudents();
    }, 180000); // 3 minutes

    return () => clearInterval(interval);
  }, []);

  const getStatusCounts = () => {
    if (!studentsData?.students) return { verified: 0, failed: 0, pending: 0 };
    
    return studentsData.students.reduce(
      (acc, student) => {
        switch (student.status.toLowerCase()) {
          case 'verified':
            acc.verified++;
            break;
          case 'failed':
            acc.failed++;
            break;
          default:
            acc.pending++;
        }
        return acc;
      },
      { verified: 0, failed: 0, pending: 0 }
    );
  };

  const stats = getStatusCounts();

  // Filter and sort students based on search term and sort filter
  const filteredAndSortedStudents = useMemo(() => {
    if (!studentsData?.students) return [];

    let filtered = studentsData.students;

    // Apply search filter (enrollment number)
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.enrollment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (sortFilter !== "all") {
      filtered = filtered.filter(student => {
        const status = student.status.toLowerCase();
        if (sortFilter === "paid") return status === "paid" || status === "verified";
        if (sortFilter === "unpaid") return status === "unpaid" || status === "pending" || status === "failed";
        return true;
      });
    }

    // Sort by status (paid first, then unpaid)
    return filtered.sort((a, b) => {
      const statusA = a.status.toLowerCase();
      const statusB = b.status.toLowerCase();
      
      const isPaidA = statusA === "paid" || statusA === "verified";
      const isPaidB = statusB === "paid" || statusB === "verified";
      
      if (isPaidA && !isPaidB) return -1;
      if (!isPaidA && isPaidB) return 1;
      return a.enrollment.localeCompare(b.enrollment);
    });
  }, [studentsData?.students, searchTerm, sortFilter]);

  return (
    <div className="space-y-6">
      {/* Header with stats and controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-mono gradient-text glow-text">
            STUDENT VERIFICATION MATRIX
          </h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground font-mono">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{studentsData?.students?.length || 0} Students</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by enrollment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 cyberpunk-border bg-background/50 font-mono"
              />
            </div>

            {/* Sort Filter */}
            <Select value={sortFilter} onValueChange={setSortFilter}>
              <SelectTrigger className="w-40 cyberpunk-border bg-background/50 font-mono">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="paid">Paid Only</SelectItem>
                <SelectItem value="unpaid">Unpaid Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Stats */}
          <div className="flex space-x-2 text-xs font-mono">
            <div className="px-2 py-1 rounded bg-success/20 text-success border border-success/30">
              ✓ {stats.verified}
            </div>
            <div className="px-2 py-1 rounded bg-destructive/20 text-destructive border border-destructive/30">
              ✗ {stats.failed}
            </div>
            <div className="px-2 py-1 rounded bg-secondary/20 text-secondary-foreground border border-secondary/30">
              ◯ {stats.pending}
            </div>
          </div>

          {/* Seat Chart Link */}
          <Link to="/seats">
            <Button
              variant="outline"
              className="cyberpunk-border hover:shadow-glow-cyan transition-all duration-300"
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              <span className="font-mono uppercase">SEAT CHART</span>
            </Button>
          </Link>

          {/* Refresh Button */}
          <Button
            onClick={handleManualRefresh}
            disabled={isLoading}
            variant="outline"
            className="cyberpunk-border hover:shadow-glow-cyan transition-all duration-300"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="font-mono uppercase">
              {isLoading ? 'SYNCING...' : 'REFRESH'}
            </span>
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !studentsData && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-primary animate-pulse" />
            <div className="space-y-1">
              <p className="text-lg font-mono gradient-text">ACCESSING DATABASE...</p>
              <p className="text-sm text-muted-foreground font-mono">Establishing secure connection</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && !studentsData?.students && (
        <div className="text-center py-12">
          <div className="space-y-4">
            <Database className="w-16 h-16 text-destructive mx-auto animate-pulse" />
            <div>
              <h3 className="text-xl font-mono text-destructive">CONNECTION FAILED</h3>
              <p className="text-muted-foreground">Unable to access student database</p>
            </div>
            <Button onClick={handleManualRefresh} variant="outline" className="cyberpunk-border">
              <RefreshCw className="w-4 h-4 mr-2" />
              RETRY CONNECTION
            </Button>
          </div>
        </div>
      )}

      {/* Results Info */}
      {studentsData?.students && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-mono">
            Showing {filteredAndSortedStudents.length} of {studentsData.students.length} students
            {searchTerm && ` matching "${searchTerm}"`}
            {sortFilter !== "all" && ` (${sortFilter} only)`}
          </p>
        </div>
      )}

      {/* Students Grid */}
      {filteredAndSortedStudents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedStudents.map((student, index) => (
            <div
              key={student.enrollment}
              className="animate-slide-up"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              <StudentCard
                student={student}
                onVerificationComplete={handleVerificationComplete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty Search Results */}
      {studentsData?.students && filteredAndSortedStudents.length === 0 && studentsData.students.length > 0 && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-mono text-muted-foreground">NO MATCHES FOUND</h3>
          <p className="text-muted-foreground">
            No students match your search criteria
          </p>
          <Button 
            onClick={() => {
              setSearchTerm("");
              setSortFilter("all");
            }}
            variant="outline" 
            className="mt-4 cyberpunk-border"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Empty State */}
      {studentsData?.students?.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-mono text-muted-foreground">NO STUDENTS FOUND</h3>
          <p className="text-muted-foreground">Database contains no student records</p>
        </div>
      )}
    </div>
  );
};

export default StudentGrid;