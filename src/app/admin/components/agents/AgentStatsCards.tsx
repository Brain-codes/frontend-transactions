"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, UserPlus } from "lucide-react";
import { SalesAgent } from "@/types/salesAgent";

interface AgentStatsCardsProps {
  agents: SalesAgent[];
}

const AgentStatsCards: React.FC<AgentStatsCardsProps> = ({ agents }) => {
  const totalAgents = agents.length;
  const agentsWithChangedPassword = agents.filter(
    (agent) => agent.has_changed_password
  ).length;
  const newAgents = agents.filter(
    (agent) => !agent.has_changed_password
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Agents
          </CardTitle>
          <Users className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalAgents}</div>
          <p className="text-xs text-gray-600 mt-1">
            Active sales team members
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Password Changed
          </CardTitle>
          <Shield className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {agentsWithChangedPassword}
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Agents with updated passwords
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            New Agents
          </CardTitle>
          <UserPlus className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{newAgents}</div>
          <p className="text-xs text-gray-600 mt-1">Using default passwords</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentStatsCards;
