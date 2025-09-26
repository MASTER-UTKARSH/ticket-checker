import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  enrollment: string;
  name: string;
  uniqueCode: string;
  status: string;
}

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onVerificationResult: (success: boolean) => void;
}

const VerifyModal = ({ isOpen, onClose, student, onVerificationResult }: VerifyModalProps) => {
  const [uniqueCode, setUniqueCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!uniqueCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter your unique code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-student', {
        body: {
          enrollment: student.enrollment,
          uniqueCode: uniqueCode.trim()
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: data.verified ? "✅ Verification Successful!" : "❌ Verification Failed",
          description: data.message,
          variant: data.verified ? "default" : "destructive"
        });
        
        onVerificationResult(data.verified);
      } else {
        throw new Error(data?.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify student",
        variant: "destructive"
      });
      onVerificationResult(false);
    } finally {
      setIsLoading(false);
      setUniqueCode("");
    }
  };

  const handleClose = () => {
    setUniqueCode("");
    setShowCode(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-lg border-primary/20 cyberpunk-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-lg" />
        
        <DialogHeader className="relative z-10">
          <DialogTitle className="flex items-center space-x-2 text-xl font-mono">
            <Shield className="w-6 h-6 text-primary animate-pulse-glow" />
            <span className="gradient-text">IDENTITY VERIFICATION</span>
          </DialogTitle>
        </DialogHeader>

        <div className="relative z-10 space-y-6">
          {/* Student Info Panel */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-sm font-mono text-muted-foreground uppercase">Target Identity</span>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-foreground">{student.name}</p>
              <p className="text-sm font-mono text-muted-foreground">ID: {student.enrollment}</p>
            </div>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uniqueCode" className="text-sm font-mono uppercase tracking-wide">
                Access Code
              </Label>
              <div className="relative">
                <Input
                  id="uniqueCode"
                  type={showCode ? "text" : "password"}
                  value={uniqueCode}
                  onChange={(e) => setUniqueCode(e.target.value)}
                  placeholder="Enter your unique verification code"
                  className="pr-12 bg-input/50 border-border/50 focus:border-primary font-mono text-center tracking-wider"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                  onClick={() => setShowCode(!showCode)}
                >
                  {showCode ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 font-mono uppercase"
                disabled={isLoading}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !uniqueCode.trim()}
                className="flex-1 bg-gradient-primary text-background hover:shadow-glow-cyan font-mono uppercase tracking-wide"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    VERIFYING...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    VERIFY
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Warning Notice */}
          <div className="text-xs text-muted-foreground text-center font-mono border-t border-border/30 pt-4">
            <p>⚠️ SECURE CHANNEL ENABLED</p>
            <p>Authentication attempt will be logged</p>
          </div>
        </div>

        {/* Animated border effect */}
        <div className="absolute inset-0 rounded-lg border border-primary/20 animate-glow-border pointer-events-none" />
      </DialogContent>
    </Dialog>
  );
};

export default VerifyModal;