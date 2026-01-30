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
    relative p-6 rounded-xl border border-border bg-card/50 backdrop-blur-sm
    transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
    ${isVerifiedLike ? 'cyberpunk-border glow-success animate-pulse-glow' : ''}
    ${isFailed ? 'cyberpunk-border glow-destructive' : ''}
    ${isAnimating && isVerifiedLike ? 'animate-status-verified' : ''}
    ${isAnimating && isFailed ? 'animate-status-failed' : ''}
    group
  `;

  return (
    <>
      <div className={cardClass}>
        {/* Animated background gradient for verified students */}
        {isVerifiedLike && (
          <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-primary/10 rounded-xl" />
        )}
        
        {/* Glowing corner accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary rounded-tl-xl opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-accent rounded-br-xl opacity-60 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10 space-y-4">
          {/* Header with status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <span className="font-mono text-sm text-muted-foreground">STUDENT</span>
            </div>
            <Badge 
              variant={getStatusColor(student.status)}
              className={`flex items-center space-x-1 animate-slide-up ${
                isVerifiedLike
                  ? 'bg-success text-success-foreground border-success' 
                  : ''
              }`}
            >
              {getStatusIcon(student.status)}
              <span className="uppercase font-mono text-xs">
                {student.status || 'pending'}
              </span>
            </Badge>
          </div>

          {/* Student Info */}
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-bold gradient-text mb-1">
                {student.name}
              </h3>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Hash className="w-4 h-4" />
                <span className="font-mono text-sm">{student.enrollment}</span>
              </div>
              {isVerifiedLike && student.seat && (
                <div className="flex items-center justify-center space-x-3 text-success mt-3 p-3 bg-success/20 rounded-lg border-2 border-success/50 shadow-glow-success animate-fade-in">
                  <Armchair className="w-5 h-5" />
                  <span className="font-mono text-base font-bold">Your allocated seat number: {student.seat}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isVerifiedLike ? (
              <Button 
                variant="outline" 
                className="w-full bg-success/10 border-success text-success hover:bg-success hover:text-success-foreground"
                disabled
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                VERIFIED
              </Button>
            ) : isFailed ? (
              <Button 
                variant="outline"
                onClick={handleVerifyClick}
                className="w-full bg-destructive/10 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <ShieldX className="w-4 h-4 mr-2" />
                RETRY VERIFICATION
              </Button>
            ) : (
              <Button 
                onClick={handleVerifyClick}
                className="w-full bg-gradient-primary text-background hover:shadow-glow-cyan transition-all duration-300 font-mono uppercase tracking-wider"
              >
                <Shield className="w-4 h-4 mr-2" />
                VERIFY YOURSELF
              </Button>
            )}
          </div>
        </div>

        {/* Scan line effect for pending students */}
        {isPendingLike && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        )}
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