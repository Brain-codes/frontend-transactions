/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";

export default function Home() {
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

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

  const filteredTransactions = transactions.filter((transaction) =>
    transaction.endUserName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex flex-col items-center justify-center">
        <input
          type="text"
          placeholder="Search by End User Name"
          className="mb-4 p-2 border border-gray-300 outline-none active:outline-none focus:border-blue-800 rounded md:w-[50%] w-full text-blue-950"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {loading ? (
          <p className="text-blue-950">Loading transactions...</p>
        ) : filteredTransactions.length === 0 ? (
          <p className="text-blue-950">No transactions found.</p>
        ) : (
          filteredTransactions.map((transaction) => (
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
                {" "}
                <span className="font-[600]">End User: </span>
                {transaction.endUserName}
              </p>
              <p>
                {" "}
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
                {" "}
                <span className="font-[600]">Address:</span>{" "}
                {transaction.address}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
