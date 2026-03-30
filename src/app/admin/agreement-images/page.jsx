"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  FileImage,
  Loader2,
  Image as ImageIcon,
  Calendar,
  User,
  Building2,
  Package,
  Download,
  AlertCircle,
  RefreshCw,
  Hash,
  Tag,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import agreementImagesService from "../../services/agreementImagesService";

const DetailItem = ({ label, value }) => (
  <div className="space-y-0">
    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
    <p className="text-xs font-medium">{value ?? <span className="text-gray-400">N/A</span>}</p>
  </div>
);

const SectionCard = ({ title, children, className = "" }) => (
  <div className={`bg-muted/30 rounded-lg p-3 border border-border/50 ${className}`}>
    <h3 className="text-[10px] font-semibold text-primary uppercase tracking-wider border-b border-primary/20 pb-0.5 mb-2">
      {title}
    </h3>
    {children}
  </div>
);

const getStatusClass = (status) => {
  switch (status?.toLowerCase()) {
    case "completed": return "bg-green-100 text-green-700";
    case "pending":   return "bg-yellow-100 text-yellow-700";
    case "incomplete":return "bg-red-100 text-red-700";
    case "assigned":  return "bg-blue-100 text-blue-700";
    default:          return "bg-gray-100 text-gray-700";
  }
};

const formatDate = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const AdminAgreementImagesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [imageDetails, setImageDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (serialNumber = null) => {
    const serial = (serialNumber || searchTerm).trim();
    if (!serial) { setError("Please enter a serial number to search"); return; }

    setSearching(true);
    setError("");
    setCurrentImage(null);
    setImageDetails(null);

    try {
      const imageResponse = await agreementImagesService.getAgreementImageBinary(serial);
      if (!imageResponse.success) { setError(imageResponse.error); return; }
      setCurrentImage(imageResponse.data);

      const detailsResponse = await agreementImagesService.getAgreementImageDetails(serial);
      if (detailsResponse.success) setImageDetails(detailsResponse.data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = () => {
    if (!currentImage) return;
    const link = document.createElement("a");
    link.href = currentImage.imageUrl;
    link.download = `agreement_${currentImage.serialNumber || "image"}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setSearchTerm("");
    setCurrentImage(null);
    setImageDetails(null);
    setError("");
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (currentImage?.imageUrl) agreementImagesService.cleanupImageUrl(currentImage.imageUrl);
    };
  }, [currentImage]);

  return (
    <ProtectedRoute>
      <DashboardLayout currentRoute="admin-agreement-images" title="Agreement Images">
        <div className="p-6 space-y-5">

          {/* Filter / Search bar */}
          <div className="bg-blue-50 p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Enter stove serial number (e.g. 101052766)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 bg-white h-9 text-sm"
                disabled={searching}
              />
            </div>
            <Button
              onClick={() => handleSearch()}
              disabled={searching || !searchTerm.trim()}
              className="bg-brand hover:bg-brand/90 text-white h-9"
              size="sm"
            >
              {searching ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Search</>
              )}
            </Button>
            {(currentImage || error) && (
              <Button variant="outline" size="sm" onClick={handleClear} className="h-9">
                <RefreshCw className="h-4 w-4 mr-1" />Clear
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Empty state */}
          {!currentImage && !error && !searching && (
            <div className="bg-white border border-gray-200 rounded-lg py-16 flex flex-col items-center justify-center text-center gap-3">
              <FileImage className="h-14 w-14 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No image loaded</p>
              <p className="text-xs text-gray-400">Enter a stove serial number above to search for its agreement image</p>
            </div>
          )}

          {/* Results */}
          {currentImage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Image card */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Card header */}
                <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-brand" />
                    <span className="text-sm font-semibold text-gray-800">Agreement Image</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 px-2 text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" />Download
                    </Button>
                  </div>
                </div>

                {/* Image */}
                <div className="p-4">
                  <div className="relative aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    <img
                      src={currentImage.imageUrl}
                      alt={`Agreement for ${currentImage.serialNumber}`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                    <div className="absolute inset-0 items-center justify-center bg-gray-50" style={{ display: "none" }}>
                      <div className="text-center text-gray-400">
                        <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                        <p className="text-xs">Image failed to load</p>
                      </div>
                    </div>
                  </div>

                  {/* Image metadata */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Serial Number</p>
                      <p className="text-xs font-mono font-semibold text-gray-800 mt-0.5">{currentImage.serialNumber || "—"}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md px-3 py-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Content Type</p>
                      <p className="text-xs font-medium text-gray-800 mt-0.5">{currentImage.contentType || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sale info card */}
              {imageDetails && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-brand" />
                      <span className="text-sm font-semibold text-gray-800">Sale Information</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailsOpen(true)}
                      className="h-7 px-2 text-xs"
                    >
                      View All Details
                    </Button>
                  </div>

                  <div className="p-4 space-y-3">
                    <SectionCard title="Sale Details">
                      <div className="grid grid-cols-2 gap-3">
                        <DetailItem label="Sale Date" value={
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {formatDate(imageDetails.sale.sales_date)}
                          </span>
                        } />
                        <DetailItem label="Status" value={
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getStatusClass(imageDetails.sale.status)}`}>
                            {imageDetails.sale.status || "N/A"}
                          </span>
                        } />
                        <DetailItem label="End User" value={
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-gray-400" />
                            {imageDetails.sale.end_user_name || "N/A"}
                          </span>
                        } />
                        <DetailItem label="Contact Person" value={imageDetails.sale.contact_person || "N/A"} />
                      </div>
                    </SectionCard>

                    <SectionCard title="Partner & Stove">
                      <div className="grid grid-cols-2 gap-3">
                        <DetailItem label="Partner" value={
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-gray-400" />
                            {imageDetails.sale.partner_name || "N/A"}
                          </span>
                        } />
                        <DetailItem label="Serial No." value={
                          <span className="font-mono">{imageDetails.sale.stove_serial_no || "N/A"}</span>
                        } />
                      </div>
                    </SectionCard>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full details modal */}
          {imageDetails && (
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <FileImage className="h-4 w-4 text-brand" />
                    Complete Sale Details
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-1">
                  <SectionCard title="Sale Information">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem label="Sale ID" value={<span className="font-mono text-xs">{imageDetails.sale.id}</span>} />
                      <DetailItem label="Serial Number" value={<span className="font-mono">{imageDetails.sale.stove_serial_no}</span>} />
                      <DetailItem label="Sale Date" value={formatDate(imageDetails.sale.sales_date)} />
                      <DetailItem label="Status" value={
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${getStatusClass(imageDetails.sale.status)}`}>
                          {imageDetails.sale.status || "N/A"}
                        </span>
                      } />
                      <DetailItem label="End User Name" value={imageDetails.sale.end_user_name || "N/A"} />
                      <DetailItem label="Contact Person" value={imageDetails.sale.contact_person || "N/A"} />
                      <DetailItem label="Partner Name" value={imageDetails.sale.partner_name || "N/A"} />
                    </div>
                  </SectionCard>

                  <SectionCard title="Image Information">
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem label="Image ID" value={<span className="font-mono text-xs">{imageDetails.image.id}</span>} />
                      <DetailItem label="Public ID" value={<span className="font-mono text-xs">{imageDetails.image.public_id}</span>} />
                      <DetailItem label="Content Type" value={imageDetails.image.type} />
                      <DetailItem label="Upload Date" value={formatDate(imageDetails.image.created_at)} />
                    </div>
                    {imageDetails.image.url && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1">Original URL</p>
                        <p className="text-xs font-mono text-brand break-all">{imageDetails.image.url}</p>
                      </div>
                    )}
                  </SectionCard>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />Download Image
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
};

export default AdminAgreementImagesPage;
