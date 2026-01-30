import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
  seat: string;
}

interface SeatInfo {
  seatNumber: number;
  isOccupied: boolean;
  studentName?: string;
  enrollment?: string;
}

const SeatChart = () => {
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { toast } = useToast();

  const TOTAL_SEATS = 40;
  const SEATS_PER_ROW = 4; // 2x2 layout

  const fetchSeatData = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-students');
      
      if (error) throw error;
      
      // Create seat map from student data
      const occupiedSeats = new Map<number, { name: string; enrollment: string }>();
      
      data.students?.forEach((student: Student) => {
        if (student.seat) {
          const seatNum = parseInt(student.seat);
          if (!isNaN(seatNum) && seatNum >= 1 && seatNum <= TOTAL_SEATS) {
            occupiedSeats.set(seatNum, {
              name: student.name,
              enrollment: student.enrollment
            });
          }
        }
      });

      // Generate all seats
      const allSeats: SeatInfo[] = [];
      for (let i = 1; i <= TOTAL_SEATS; i++) {
        const occupant = occupiedSeats.get(i);
        allSeats.push({
          seatNumber: i,
          isOccupied: !!occupant,
          studentName: occupant?.name,
          enrollment: occupant?.enrollment
        });
      }

      setSeats(allSeats);
      setLastRefresh(new Date());
      
      toast({
        title: "Seat Data Updated",
        description: `${occupiedSeats.size} of ${TOTAL_SEATS} seats occupied`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error fetching seat data:', error);
      toast({
        title: "Failed to Load",
        description: "Unable to retrieve seat data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSeatData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchSeatData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const occupiedCount = seats.filter(s => s.isOccupied).length;
  const availableCount = TOTAL_SEATS - occupiedCount;

  // Split seats into rows (2 left | aisle | 2 right)
  const rows: SeatInfo[][] = [];
  for (let i = 0; i < seats.length; i += SEATS_PER_ROW) {
    rows.push(seats.slice(i, i + SEATS_PER_ROW));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">Seat Chart</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{TOTAL_SEATS} Total Seats</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={fetchSeatData}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="px-4 py-2 rounded-lg bg-success/10 border border-success/30">
          <p className="text-xs text-muted-foreground">Available</p>
          <p className="text-2xl font-bold text-success">{availableCount}</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
          <p className="text-xs text-muted-foreground">Occupied</p>
          <p className="text-2xl font-bold text-destructive">{occupiedCount}</p>
        </div>
        <div className="px-4 py-2 rounded-lg bg-muted border border-border">
          <p className="text-xs text-muted-foreground">Capacity</p>
          <p className="text-2xl font-bold text-foreground">{TOTAL_SEATS}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-success/20 border-2 border-success" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-destructive/20 border-2 border-destructive" />
          <span>Occupied</span>
        </div>
      </div>

      {/* Bus Layout */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6 overflow-x-auto">
        {/* Driver area */}
        <div className="flex justify-center mb-6">
          <div className="px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground border border-border">
            🚌 Driver
          </div>
        </div>

        {/* Seat Grid */}
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-center gap-1 sm:gap-2">
              {/* Left side (2 seats) */}
              <div className="flex gap-1">
                {row.slice(0, 2).map((seat) => (
                  <SeatButton key={seat.seatNumber} seat={seat} />
                ))}
              </div>

              {/* Aisle */}
              <div className="w-6 sm:w-10 flex items-center justify-center text-xs text-muted-foreground">
                |
              </div>

              {/* Right side (2 seats) */}
              <div className="flex gap-1">
                {row.slice(2, 4).map((seat) => (
                  <SeatButton key={seat.seatNumber} seat={seat} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Back of bus */}
        <div className="flex justify-center mt-6">
          <div className="px-4 py-2 bg-muted rounded-lg text-sm text-muted-foreground border border-border">
            Back
          </div>
        </div>
      </div>
    </div>
  );
};

interface SeatButtonProps {
  seat: SeatInfo;
}

const SeatButton = ({ seat }: SeatButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xs sm:text-sm font-medium transition-all",
          seat.isOccupied
            ? "bg-destructive/20 border-2 border-destructive text-destructive hover:bg-destructive/30"
            : "bg-success/20 border-2 border-success text-success hover:bg-success/30"
        )}
      >
        {seat.seatNumber}
      </button>

      {/* Tooltip */}
      {showTooltip && seat.isOccupied && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10">
          <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
            <p className="font-medium">{seat.studentName}</p>
            <p className="text-muted-foreground">{seat.enrollment}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeatChart;
