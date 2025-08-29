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
import { Sale } from "@/types/sales";

type SalesTableProps = {
  displayData: Sale[];
  tableLoading: boolean;
  searchTerm: string;
  formatDate: (dateString: string) => string;
  getStoveAge: (salesDate: string) => string;
  exportSales: (filters: any, format: string) => void;
  handleShowReceipt: (sale: any) => void;
  handleShowAttachments: (sale: any) => void;
  handleDelete: (sale: any) => void;
};

const SalesTable = ({
  displayData,
  tableLoading,
  searchTerm,
  formatDate,
  getStoveAge,
  exportSales,
  handleShowReceipt,
  handleShowAttachments,
  handleDelete,
}: SalesTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Sales Partner</TableHead>
        <TableHead>Transaction ID</TableHead>
        <TableHead>Stove ID</TableHead>
        <TableHead>Longitude</TableHead>
        <TableHead>Latitude</TableHead>
        <TableHead>Sales Date</TableHead>
        <TableHead>Stove Age</TableHead>
        <TableHead>Signature</TableHead>
        <TableHead>Sales State</TableHead>
        <TableHead>Sales LGA</TableHead>
        <TableHead>End User Name</TableHead>
        <TableHead>End User Phone</TableHead>
        <TableHead>End User Address</TableHead>
        <TableHead className="text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody className={tableLoading ? "opacity-40" : ""}>
      {displayData.length === 0 ? (
        <TableRow>
          <TableCell colSpan={14} className="text-center py-8">
            <div className="text-gray-900">
              {searchTerm
                ? "No sales found matching your search."
                : "No sales data available."}
            </div>
          </TableCell>
        </TableRow>
      ) : (
        displayData.map((sale: Sale) => (
          <TableRow key={sale.id} className="hover:bg-gray-50 text-gray-700">
            <TableCell>
              {sale.partner_name ?? sale.organizations?.name ?? "N/A"}
            </TableCell>
            <TableCell className="font-medium">
              {sale.transaction_id ?? sale.id}
            </TableCell>
            <TableCell>{sale.stove_serial_no ?? "N/A"}</TableCell>
            <TableCell>{sale.addresses.latitude ?? "N/A"}</TableCell>
            <TableCell>{sale.addresses.longitude ?? "N/A"}</TableCell>
            <TableCell>{formatDate(sale.sales_date)}</TableCell>
            <TableCell>{getStoveAge(sale.sales_date)}</TableCell>
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
                    onClick={() => exportSales({ id: sale.id }, "csv")}
                  >
                    {" "}
                    <Download className="mr-2 h-4 w-4" /> Export CSV{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShowReceipt(sale)}>
                    {" "}
                    <Download className="mr-2 h-4 w-4" /> Download Receipt{" "}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShowAttachments(sale)}>
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
        ))
      )}
    </TableBody>
  </Table>
);

export default SalesTable;
