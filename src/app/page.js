/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { lgaAndStates } from "./constants"; // Import the lgaAndStates constant
import DatePicker from "react-datepicker"; // Import DatePicker
import "react-datepicker/dist/react-datepicker.css"; // Import DatePicker styles
import { FaTh, FaListUl } from "react-icons/fa"; // Import new icons from react-icons
import { BsFillGrid1X2Fill } from "react-icons/bs";
import { LuListFilter } from "react-icons/lu";
import { Table, Modal } from "antd"; // Import Table and Modal from antd

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState("table");
  const [dateRange, setDateRange] = useState([null, null]); // State for date range
  const [selectedState, setSelectedState] = useState("");
  const [selectedLGA, setSelectedLGA] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          "https://stove-transaction-backend.vercel.app/api/transactions"
        );
        setTransactions(response.data.body);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearchTerm = transaction.endUserName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDateRange =
      (!dateRange[0] || new Date(transaction.salesDate) >= dateRange[0]) &&
      (!dateRange[1] || new Date(transaction.salesDate) <= dateRange[1]);
    const matchesState = !selectedState || transaction.state === selectedState;
    const matchesLGA = !selectedLGA || transaction.lga === selectedLGA;

    return matchesSearchTerm && matchesDateRange && matchesState && matchesLGA;
  });

  const handleRowClick = (record) => {
    setSelectedTransaction(record);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col items-center justify-center">
        <div className="flex md:flex-row flex-col justify-between w-full">
          <input
            type="text"
            placeholder="Search by End User Name"
            className="mb-4 p-2 border border-gray-300 outline-none active:outline-none focus:border-blue-800 rounded md:w-[50%] w-full text-blue-950"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Date Range Input */}
          <div className="flex space-x-4 mb-4">
            <DatePicker
              selected={dateRange[0]} // Start date
              onChange={(update) => setDateRange(update)} // Update date range
              selectsRange // Enable range selection
              startDate={dateRange[0]} // Start date
              endDate={dateRange[1]} // End date
              className="p-2 border border-gray-300 rounded text-blue-950"
              placeholderText="Select date range"
            />
          </div>

          {/* State Dropdown */}
          <select
            className="mb-4 p-2 border border-gray-300 rounded text-blue-950"
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              setSelectedLGA(""); // Reset LGA when state changes
            }}
          >
            <option value="">Select State</option>
            {Object.keys(lgaAndStates).map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          {/* LGA Dropdown */}
          <select
            className="mb-4 p-2 border border-gray-300 rounded text-blue-950"
            value={selectedLGA}
            onChange={(e) => setSelectedLGA(e.target.value)}
          >
            <option value="">Select LGA</option>
            {selectedState &&
              lgaAndStates[selectedState].map((lga) => (
                <option key={lga} value={lga}>
                  {lga}
                </option>
              ))}
          </select>
        </div>
        <div className="flex justify-between items-center mb-4 w-full">
          <Link
            href="/map"
            className=" p-2 border border-gray-300 rounded text-blue-950"
          >
            Go to Heat Map
          </Link>

          <div className="flex  text-blue-950 border">
            <button
              onClick={() => setViewType("grid")}
              className={`p-2 ${viewType === "grid" ? "bg-blue-300" : ""}`}
            >
              <BsFillGrid1X2Fill />
            </button>
            <button
              onClick={() => setViewType("table")}
              className={`p-2 ${viewType === "table" ? "bg-blue-300" : ""}`}
            >
              <LuListFilter />
            </button>
          </div>
        </div>
      </div>
      {loading ? (
        <p className="text-blue-950">Loading transactions...</p>
      ) : filteredTransactions.length === 0 ? (
        <p className="text-blue-950">No transactions found.</p>
      ) : viewType === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction._id}
              className="border rounded-lg p-4 shadow-md border-blue-100 text-blue-950"
            >
              <img
                src={transaction.stoveImage.url}
                alt={transaction.stoveSerialNo}
                width={300}
                height={200}
                className="rounded bg-blue-950 w-full md:h-[40dvh] h-[20dvh] object-cover"
              />
              <h2 className="font-bold text-lg mt-2 ">
                {transaction.transactionId}
              </h2>
              <p>
                <span className="font-[600]">End User: </span>
                {transaction.endUserName}
              </p>
              <p>
                <span className="font-[600]">Amount:</span> ₦
                {transaction.amount.toLocaleString()}
              </p>
              <p>
                <span className="font-[600]">Sales Date: </span>
                {new Date(transaction.salesDate).toLocaleDateString()}
              </p>
              <p>
                <span className="font-[600]">Contact: </span>
                {transaction.contactPerson} ({transaction.contactPhone})
              </p>
              <p>
                <span className="font-[600]">Address:</span>{" "}
                {transaction.address}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <Table
            dataSource={filteredTransactions}
            rowKey="_id"
            className="min-w-full mt-10 text-blue-950"
            pagination={{ pageSize: 10 }}
            onRow={(record) => {
              return {
                onClick: () => handleRowClick(record),
              };
            }}
          >
            <Table.Column
              title="TRANSACTION ID"
              dataIndex="transactionId"
              key="transactionId"
            />
            <Table.Column
              title="STOVE ID"
              dataIndex="stoveSerialNo"
              key="stoveSerialNo"
            />
            <Table.Column
              title="SALES DATE"
              dataIndex="salesDate"
              key="salesDate"
              render={(date) => new Date(date).toLocaleDateString()}
            />
            <Table.Column
              title="SALES PARTNER"
              dataIndex="salesPartner"
              key="salesPartner"
            />
            <Table.Column title="SALES STATE" dataIndex="state" key="state" />
            <Table.Column title="SALES LGA" dataIndex="lga" key="lga" />
            <Table.Column
              title="END USER NAME"
              dataIndex="endUserName"
              key="endUserName"
            />
            <Table.Column
              title="END USER PHONE#"
              dataIndex="contactPhone"
              key="contactPhone"
            />
            <Table.Column
              title="END USER ADDRESS"
              dataIndex="address"
              key="address"
            />
            <Table.Column
              title="END USER SIGNATURE"
              key="signature"
              render={(text, record) => (
                <div>
                  <img
                    src={`data:image/png;base64,${record.signature}`}
                    alt="Signature"
                    style={{ width: 50, height: 50 }}
                  />
                  <p>View Details</p>
                </div>
              )}
            />
          </Table>
        </div>
      )}

      <Modal
        title="Transaction Details"
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
      >
        {selectedTransaction && (
          <div className="text-blue-950">
            <div className="mb-4">
              <img
                src={selectedTransaction.stoveImage.url}
                alt={selectedTransaction.stoveSerialNo}
                className="w-full h-48 object-cover rounded"
              />
            </div>
            <p>
              <strong>Transaction ID:</strong>{" "}
              {selectedTransaction.transactionId}
            </p>
            <p>
              <strong>Stove Serial No:</strong>{" "}
              {selectedTransaction.stoveSerialNo}
            </p>
            <p>
              <strong>End User:</strong> {selectedTransaction.endUserName}
            </p>
            <p>
              <strong>Amount:</strong> ₦
              {selectedTransaction.amount.toLocaleString()}
            </p>
            <p>
              <strong>Sales Date:</strong>{" "}
              {new Date(selectedTransaction.salesDate).toLocaleDateString()}
            </p>
            <p>
              <strong>Contact:</strong> {selectedTransaction.contactPerson} (
              {selectedTransaction.contactPhone})
            </p>
            <p>
              <strong>Address:</strong> {selectedTransaction.address}
            </p>
            <p>
              <strong>State:</strong> {selectedTransaction.state}
            </p>
            <p>
              <strong>LGA:</strong> {selectedTransaction.lga}
            </p>
            <div className="mt-4">
              <strong>Signature:</strong>
              <img
                src={`data:image/png;base64,${selectedTransaction.signature}`}
                alt="Signature"
                className="w-24 h-24"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
