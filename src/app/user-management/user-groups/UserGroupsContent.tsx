import DashboardLayout from "@/app/components/DashboardLayout";

type Group = {
  name: string;
  description: string;
};

const groups: Group[] = [
  { name: "Super Admin", description: "Unrestricted access to every feature, record, and setting in the application." },
  { name: "ACSL Agent Manager", description: "Manages ACSL agents and oversees their assigned partner organizations." },
  { name: "ACSL Agent", description: "Handles assigned partners, manages stoves, and creates sales on their behalf." },
  { name: "Partner", description: "Manages their own organization, partner agents, stoves, and sales records." },
  { name: "Partner Agent", description: "Creates and manages sales for their partner organization." },
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
                    <span className="text-sm font-medium text-gray-900">{g.name}</span>
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
