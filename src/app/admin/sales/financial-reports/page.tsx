"use client";

import DashboardLayout from "../../../components/DashboardLayout";
import ProtectedRoute from "../../../components/ProtectedRoute";
import FinancialReportsView from "../../components/financial-reports/FinancialReportsView";
import adminSalesService from "../../../services/adminSalesService";

const loadSales = () => adminSalesService.getFinancialReportSales({ limit: 500 });

const FinancialReportsPage = () => (
  <ProtectedRoute>
    <DashboardLayout currentRoute="admin-financial-reports" title="Sales Financial Reports">
      <FinancialReportsView loadSales={loadSales} />
    </DashboardLayout>
  </ProtectedRoute>
);

export default FinancialReportsPage;
