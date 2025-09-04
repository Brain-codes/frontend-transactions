import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserPlus, Eye, WifiSync, HardDrive } from "lucide-react";
import { useRouter } from "next/navigation";

interface QuickActionsProps {
  onSync: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onSync }) => {
  const router = useRouter();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Button
        variant="outline"
        className="h-auto p-4 flex-col space-y-2 hover:bg-blue-50"
        onClick={() => router.push("/admin/sales/create")}
      >
        <Plus className="h-6 w-6 text-blue-600" />
        <span className="font-semibold">Start New Sale</span>
        <span className="text-xs text-gray-500">Create a new sales record</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto p-4 flex-col space-y-2 hover:bg-green-50"
        onClick={() => router.push("/admin/agents")}
      >
        <UserPlus className="h-6 w-6 text-green-600" />
        <span className="font-semibold">Manage Agents</span>
        <span className="text-xs text-gray-500">
          Add or manage sales agents
        </span>
      </Button>
      <Button
        variant="outline"
        className="h-auto p-4 flex-col space-y-2 hover:bg-purple-50"
        onClick={() => router.push("/admin/sales")}
      >
        <Eye className="h-6 w-6 text-purple-600" />
        <span className="font-semibold">View All Sales</span>
        <span className="text-xs text-gray-500">Browse sales records</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto p-4 flex-col space-y-2 hover:bg-orange-50"
        onClick={onSync}
      >
        <WifiSync className="h-6 w-6 text-orange-600" />
        <span className="font-semibold">Sync Data</span>
        <span className="text-xs text-gray-500">Refresh dashboard data</span>
      </Button>
      <Button
        variant="outline"
        className="h-auto p-4 flex-col space-y-2 hover:bg-gray-50"
        onClick={() => router.push("/admin/settings")}
      >
        <HardDrive className="h-6 w-6 text-gray-600" />
        <span className="font-semibold">Settings</span>
        <span className="text-xs text-gray-500">Profile and preferences</span>
      </Button>
    </div>
  );
};

export default QuickActions;
