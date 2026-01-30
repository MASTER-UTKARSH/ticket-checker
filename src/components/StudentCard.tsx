import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldX, User, Hash, Armchair } from "lucide-react";
import VerifyModal from "./VerifyModal";

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
  seat: string;
}

interface StudentCardProps {
  student: Student;
  onVerificationComplete: () => void;
}

const StudentCard = ({ student, onVerificationComplete }: StudentCardProps) => {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const status = (student.status ?? "").toLowerCase();
  // In the sheet, successful verification may be marked as "paid".
  const isVerifiedLike = status === "verified" || status === "paid";
  const isFailed = status === "failed";
  const isPendingLike = !isVerifiedLike && !isFailed;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'paid':
        return 'default'; // Will be styled with success colors via className
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verified':
      case 'paid':
        return <ShieldCheck className="w-4 h-4" />;
      case 'failed':
        return <ShieldX className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const handleVerifyClick = () => {
    setShowVerifyModal(true);
  };

  const handleVerificationResult = (success: boolean) => {
    setIsAnimating(true);
    setShowVerifyModal(false);
    
    // Trigger animation based on result
    setTimeout(() => {
      setIsAnimating(false);
      onVerificationComplete();
    }, 600);
  };

  const cardClass = `
    relative p-4 sm:p-6 rounded-xl border bg-card
    transition-all duration-200
    ${isVerifiedLike ? 'border-success bg-success/5' : ''}
    ${isFailed ? 'border-destructive bg-destructive/5' : ''}
    ${isPendingLike ? 'border-border' : ''}
  `;

  return (
    <>
      <div className={cardClass}>
        
        <div className="space-y-3">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Student</span>
            </div>
            <Badge 
              variant={getStatusColor(student.status)}
              className={`flex items-center gap-1 text-xs ${
                isVerifiedLike
                  ? 'bg-success text-success-foreground' 
                  : ''
              }`}
            >
              {getStatusIcon(student.status)}
              <span className="uppercase">
                {student.status || 'pending'}
              </span>
            </Badge>
          </div>

          {/* Student Info */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {student.name}
            </h3>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Hash className="w-3.5 h-3.5" />
              <span className="text-sm">{student.enrollment}</span>
            </div>
            {isVerifiedLike && student.seat && (
              <div className="flex items-center justify-center gap-2 text-success mt-2 p-2.5 bg-success/10 rounded-lg border border-success/30">
                <Armchair className="w-4 h-4" />
                <span className="text-sm font-medium">Seat: {student.seat}</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-1">
            {isVerifiedLike ? (
              <Button 
                variant="outline" 
                className="w-full bg-success/10 border-success text-success text-sm h-9"
                disabled
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Verified
              </Button>
            ) : isFailed ? (
              <Button 
                variant="outline"
                onClick={handleVerifyClick}
                className="w-full bg-destructive/10 border-destructive text-destructive text-sm h-9"
              >
                <ShieldX className="w-4 h-4 mr-1.5" />
                Retry
              </Button>
            ) : (
              <Button 
                onClick={handleVerifyClick}
                className="w-full text-sm h-9"
              >
                <Shield className="w-4 h-4 mr-1.5" />
                Verify
              </Button>
            )}
          </div>
        </div>

      </div>

      <VerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        student={student}
        onVerificationResult={handleVerificationResult}
      />
    </>
  );
};

export default StudentCard;