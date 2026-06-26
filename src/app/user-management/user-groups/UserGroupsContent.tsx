import DashboardLayout from "@/app/components/DashboardLayout";

type Group = {
  name: string;
  description: string;
  pill?: boolean;
};

const groups: Group[] = [
  { name: "Accountant", description: "No description", pill: true },
  { name: "Admin", description: "Full access to all application components" },
  { name: "Data Monitoring Manager", description: "Access to Customer Management and Sales of Stoves", pill: true },
  { name: "Data Monitoring Officer", description: "Officers responsible for data monitoring tasks" },
  { name: "Executive", description: "Full access except User Management and Customer Management", pill: true },
  { name: "Factory Manager", description: "Full access except Customer Management and Factory Management" },
  { name: "Super Admin", description: "Unrestricted access to every feature and record", pill: true },
  { name: "ACSL Agent Manager", description: "Manages ACSL agents and oversees assigned partners" },
  { name: "ACSL Agent", description: "Handles assigned partners and creates sales", pill: true },
  { name: "Partner", description: "Manages own organization, agents and sales records" },
  { name: "Partner Agent", description: "Creates and manages sales for their partner organization", pill: true },
];

export default function UserGroupsContent() {
  return (
    <DashboardLayout currentRoute="user-management-groups" title="User Groups">
      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">User Groups</h1>
          <p className="text-sm text-gray-600 mt-1">
            All user groups in the system and their access roles.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "rgb(7, 55, 106)" }}>
                <th className="text-left px-6 py-3 text-white font-semibold w-1/3">Name</th>
                <th className="text-left px-6 py-3 text-white font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g, i) => (
                <tr
                  key={g.name}
                  className={i % 2 === 1 ? "bg-blue-50/60" : "bg-white"}
                >
                  <td className="px-6 py-4 align-middle">
                    {g.pill ? (
                      <span className="inline-block px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800">
                        {g.name}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{g.name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{g.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
