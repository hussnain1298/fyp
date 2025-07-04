"use client";

import { useEffect, useState } from "react";
import { firestore } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const colors = ["#82ca9d", "#8884d8", "#ffc658", "#ff8042", "#00C49F", "#FFBB28"];
const tabs = ["Requests", "Services", "Fundraisers", "Users", "Signup Trends"];

export default function Results() {
  const [requests, setRequests] = useState([]);
  const [services, setServices] = useState([]);
  const [fundraisers, setFundraisers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedRole, setSelectedRole] = useState("All");
  const [activeTab, setActiveTab] = useState("Requests");

  useEffect(() => {
    const unsub = [
      onSnapshot(collection(firestore, "requests"), snap => setRequests(snap.docs.map(d => d.data()))),
      onSnapshot(collection(firestore, "services"), snap => setServices(snap.docs.map(d => d.data()))),
      onSnapshot(collection(firestore, "fundraisers"), snap => setFundraisers(snap.docs.map(d => d.data()))),
      onSnapshot(collection(firestore, "users"), snap => setUsers(snap.docs.map(d => d.data())))
    ];
    return () => unsub.forEach(unsub => unsub());
  }, []);

  const exportToPDF = async () => {
    const input = document.getElementById("chart-section");
    if (!input) return alert("Chart section not found.");
    const canvas = await html2canvas(input);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${activeTab}_report.pdf`);
  };

  const requestTypes = ["Money", "Food", "Clothes", "Other"];
  const requestDataBar = requestTypes.map(type => ({
    name: type,
    Fulfilled: requests.filter(r => r.requestType === type && r.status === "fulfilled").length,
    Pending: requests.filter(r => r.requestType === type && r.status !== "fulfilled").length,
  }));
  const requestDataPie = requestTypes.map((type, idx) => ({
    name: type,
    value: requests.filter(r => r.requestType === type).length,
    color: colors[idx % colors.length]
  }));

  const serviceTypes = ["Academic Skills", "Technology & STEM", "Arts & Creativity", "Personal Development", "Career Training", "Social Learning"];
  const serviceDataBar = serviceTypes.map(type => ({
    name: type,
    Fulfilled: services.filter(s => s.title === type && s.status === "Fulfilled").length,
    Pending: services.filter(s => s.title === type && s.status !== "Fulfilled").length
  }));
  const serviceDataPie = serviceTypes.map((type, idx) => ({
    name: type,
    value: services.filter(s => s.title === type).length,
    color: colors[idx % colors.length]
  }));

  const fundraiserTypes = ["Books", "School Uniforms", "Nutrition", "Medical Aid", "Other"];
  const fundraiserDataBar = fundraiserTypes.map(type => {
    const items = fundraisers.filter(f => f.title === type);
    const raised = items.reduce((sum, f) => sum + (f.raisedAmount || 0), 0);
    const total = items.reduce((sum, f) => sum + (f.totalAmount || 0), 0);
    return {
      name: type,
      Raised: raised,
      Remaining: Math.max(0, total - raised)
    };
  });
  const fundraiserDataPie = fundraiserTypes.map((type, idx) => ({
    name: type,
    value: fundraisers.filter(f => f.title === type).length,
    color: colors[idx % colors.length]
  }));

  const userRoles = ["Admin", "Donor", "Orphanage"];
  const userData = userRoles.map((role, idx) => ({
    name: role,
    value: users.filter(u => u.userType === role).length,
    color: colors[idx % colors.length]
  }));

  const signupTrendData = [];
  for (let i = 0; i < 12; i++) {
    const label = dayjs().month(i).format("MMM");
    const monthKey = dayjs(`${selectedYear}-${(i + 1).toString().padStart(2, "0")}`);
    const count = users.filter(user => {
      const ts = user.createdAt?.toDate?.();
      const roleMatch = selectedRole === "All" || user.userType === selectedRole;
      return ts && dayjs(ts).format("YYYY-MM") === monthKey.format("YYYY-MM") && roleMatch;
    }).length;
    signupTrendData.push({ month: label, count });
  }

  return (
    <div className="p-6">
      <div className="flex space-x-4 mb-6 justify-center">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded font-medium ${activeTab === tab ? "bg-green-600 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="text-center mb-4">
        <button onClick={exportToPDF} className="bg-blue-500 text-white px-4 py-2 rounded">
          Export PDF
        </button>
      </div>
      <div id="chart-section">
        {activeTab === "Requests" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Request Fulfillment (Bar)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={requestDataBar}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Fulfilled" stackId="a" fill="#82ca9d" />
                <Bar dataKey="Pending" stackId="a" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Requests by Type (Pie)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={requestDataPie} dataKey="value" nameKey="name" outerRadius={100} label>
                  {requestDataPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "Services" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Service Fulfillment (Bar)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={serviceDataBar}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Fulfilled" fill="#00C49F" />
                <Bar dataKey="Pending" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Services by Type (Pie)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={serviceDataPie} dataKey="value" nameKey="name" outerRadius={100} label>
                  {serviceDataPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "Fundraisers" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Fundraiser Progress (Bar)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={fundraiserDataBar}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Raised" fill="#8884d8" />
                <Bar dataKey="Remaining" fill="#ff8042" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-lg font-semibold mb-4">Fundraisers by Type (Pie)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={fundraiserDataPie} dataKey="value" nameKey="name" outerRadius={100} label>
                  {fundraiserDataPie.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "Users" && (
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-4">Users by Role (Pie)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={userData} dataKey="value" nameKey="name" outerRadius={100} label>
                {userData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === "Signup Trends" && (
        <div className="bg-white p-6 rounded shadow">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <h3 className="text-lg font-semibold">Signup Trends</h3>
            <select
              className="border px-3 py-1 rounded text-sm"
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }).map((_, i) => {
                const year = dayjs().year() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
            <select
              className="border px-3 py-1 rounded text-sm"
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
            >
              <option value="All">All Roles</option>
              {userRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signupTrendData}>
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#00C49F" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
       
    </div>
  );
}
