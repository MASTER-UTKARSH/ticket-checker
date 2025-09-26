import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Database, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import StudentCard from "./StudentCard";

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
}

interface StudentsData {
  students: Student[];
  lastUpdated: string;
}

const StudentGrid = () => {
  const [studentsData, setStudentsData] = useState<StudentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
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

        <div className="flex items-center space-x-4">
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

      {/* Students Grid */}
      {studentsData?.students && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentsData.students.map((student, index) => (
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