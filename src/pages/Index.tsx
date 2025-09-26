import StudentGrid from "@/components/StudentGrid";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Cyberpunk background pattern */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_24%,rgba(0,255,255,0.03)_25%,rgba(0,255,255,0.03)_26%,transparent_27%,transparent_74%,rgba(0,255,255,0.03)_75%,rgba(0,255,255,0.03)_76%,transparent_77%,transparent),linear-gradient(transparent_24%,rgba(255,0,255,0.03)_25%,rgba(255,0,255,0.03)_26%,transparent_27%,transparent_74%,rgba(255,0,255,0.03)_75%,rgba(255,0,255,0.03)_76%,transparent_77%,transparent)] bg-[length:50px_50px]" />
      </div>
      
      <div className="relative container mx-auto px-4 py-8">
        <StudentGrid />
      </div>
    </div>
  );
};

export default Index;
