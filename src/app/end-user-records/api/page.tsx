import ProtectedRoute from "../../components/ProtectedRoute";
import ApiEndpointContent from "./ApiEndpointContent";

export default function EndUserRecordsApiPage() {
  return (
    <ProtectedRoute requireAdminAccess>
      <ApiEndpointContent />
    </ProtectedRoute>
  );
}
