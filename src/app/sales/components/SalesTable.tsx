/* eslint-disable @next/next/no-img-element */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Download, Eye, Trash2 } from "lucide-react";
import { SuperAdminSale } from "@/types/superAdminSales";
import { Checkbox } from "../../../components/ui/checkbox";

type SalesTableProps = {
  displayData: SuperAdminSale[];
  tableLoading: boolean;
  searchTerm: string;
  formatDate: (dateString: string) => string;
  getStoveAge: (salesDate: string) => string;
  exportSales: (filters: any, format: string) => void;
  handleDownloadReceipt: (sale: SuperAdminSale) => void;
  handleShowAttachments: (sale: SuperAdminSale) => void;
  handleDelete: (sale: SuperAdminSale) => void;
  selectedItems: Set<string>;
  onSelectItem: (itemId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
};

const SalesTable = ({
  displayData,
  tableLoading,
  searchTerm,
  formatDate,
  getStoveAge,
  exportSales,
  handleDownloadReceipt,
  handleShowAttachments,
  handleDelete,
  selectedItems,
  onSelectItem,
  onSelectAll,
}: SalesTableProps) => {
  // Check if all items on current page are selected
  const allCurrentPageSelected =
    displayData.length > 0 &&
    displayData.every((sale) => selectedItems.has(sale.id.toString()));

  // Check if some (but not all) items are selected
  const someSelected = displayData.some((sale) =>
    selectedItems.has(sale.id.toString()),
  );

  return (
    <Table>
      <TableHeader className="bg-brand">
        <TableRow className="hover:bg-brand">
          <TableHead className="text-white py-4 first:rounded-tl-lg w-12">
            <Checkbox
              checked={allCurrentPageSelected}
              onCheckedChange={(checked: boolean) => onSelectAll(checked)}
              aria-label="Select all items on this page"
              ref={(el: HTMLInputElement | null) => {
                if (el)
                  el.indeterminate = someSelected && !allCurrentPageSelected;
              }}
              className="border-white data-[state=checked]:bg-white data-[state=checked]:text-brand"
            />
          </TableHead>
          <TableHead className="text-white py-4">Sales Partner</TableHead>
          <TableHead className="text-white py-4">Transaction ID</TableHead>
          <TableHead className="text-white py-4">Stove ID</TableHead>
          <TableHead className="text-white py-4">Longitude</TableHead>
          <TableHead className="text-white py-4">Latitude</TableHead>
          <TableHead className="text-white py-4">Sales Date</TableHead>
          <TableHead className="text-white py-4">Stove Age</TableHead>
          <TableHead className="text-white py-4">Signature</TableHead>
          <TableHead className="text-white py-4">Sales State</TableHead>
          <TableHead className="text-white py-4">Sales LGA</TableHead>
          <TableHead className="text-white py-4">End User Name</TableHead>
          <TableHead className="text-white py-4">End User Phone</TableHead>
          <TableHead className="text-white py-4">End User Address</TableHead>
          <TableHead className="text-center text-white py-4 last:rounded-tr-lg">
            Actions
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className={tableLoading ? "opacity-40" : ""}>
        {displayData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={15} className="text-center py-8">
              <div className="text-gray-500">
                {searchTerm
                  ? "No sales found matching your search."
                  : "No sales data available."}
              </div>
            </TableCell>
          </TableRow>
        ) : (
          displayData.map((sale: SuperAdminSale, index: number) => {
            const isSelected = selectedItems.has(sale.id.toString());

            return (
              <TableRow
                key={sale.id}
                className={`${
                  index % 2 === 0 ? "bg-white" : "bg-brand-light"
                } hover:bg-gray-50`}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked: boolean) =>
                      onSelectItem(sale.id.toString(), checked)
                    }
                    aria-label={`Select sale ${sale.transaction_id || sale.id}`}
                  />
                </TableCell>
                <TableCell>
                  {sale.partner_name ?? sale.organizations?.name ?? "N/A"}
                </TableCell>
                <TableCell className="font-medium">
                  {sale.transaction_id ?? sale.id}
                </TableCell>
                <TableCell>{sale.stove_serial_no ?? "N/A"}</TableCell>
                <TableCell>{sale.addresses?.latitude ?? "N/A"}</TableCell>
                <TableCell>{sale.addresses?.longitude ?? "N/A"}</TableCell>
                <TableCell>{formatDate(sale.sales_date ?? "")}</TableCell>
                <TableCell>{getStoveAge(sale.sales_date ?? "")}</TableCell>
                <TableCell>
                  {sale.signature ? (
                    <img
                      src={`data:image/png;base64,${sale.signature}`}
                      alt="Signature"
                      className="h-8 w-16 object-contain border rounded"
                    />
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>
                  {sale.state_backup ?? sale.addresses?.state ?? "N/A"}
                </TableCell>
                <TableCell>
                  {sale.lga_backup ?? sale.addresses?.city ?? "N/A"}
                </TableCell>
                <TableCell>{sale.end_user_name ?? "N/A"}</TableCell>
                <TableCell>{sale.phone ?? "N/A"}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {sale.addresses?.full_address ?? "N/A"}
                </TableCell>
                <TableCell className="cursor-pointer text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={async () => {
                          // Export single sale using our custom format
                          try {
                            const { formatSalesDataToCSV, downloadCSV } =
                              await import("../../../utils/csvExportUtils");
                            const csvContent = formatSalesDataToCSV([sale]);
                            const filename = `sale-${
                              sale.transaction_id || sale.id
                            }-${new Date().toISOString().split("T")[0]}.csv`;
                            downloadCSV(csvContent, filename);
                          } catch (error) {
                            console.error("Export error:", error);
                          }
                        }}
                      >
                        {" "}
                        <Download className="mr-2 h-4 w-4" /> Export CSV{" "}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDownloadReceipt(sale)}
                      >
                        {" "}
                        <Download className="mr-2 h-4 w-4" /> Download
                        Receipt{" "}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShowAttachments(sale)}
                      >
                        {" "}
                        <Eye className="mr-2 h-4 w-4" /> View Attachments{" "}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(sale)}
                        className="text-red-600"
                      >
                        {" "}
                        <Trash2 className="mr-2 h-4 w-4" /> Delete{" "}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default SalesTable;
