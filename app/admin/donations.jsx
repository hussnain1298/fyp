"use client"
import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"

import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Eye, ArrowUp, ArrowDown } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export default function AdminDonations() {
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedDonation, setSelectedDonation] = useState(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  // Filter and Sort States
  const [filterType, setFilterType] = useState("all") // "all", "money", "clothes", "food"
  const [filterStatus, setFilterStatus] = useState("all") // "all", "pending_payment", "pending_pickup", "completed", "picked_up", "cancelled"
  const [searchTerm, setSearchTerm] = useState("") // For donor name search
  const [sortBy, setSortBy] = useState("timestamp") // "timestamp", "donationAmount", "clothesQty", "foodQty"
  const [sortOrder, setSortOrder] = useState("desc") // "asc", "desc"

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch all publicDonations, ordering by timestamp by default
        const q = query(collection(db, "publicDonations"), orderBy("timestamp", "desc"))
        const querySnapshot = await getDocs(q)
        const donationsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate().toLocaleString(), // Convert Timestamp to readable string
        }))
        setDonations(donationsList)
      } catch (err) {
        console.error("Error fetching donations:", err)
        setError("Failed to load donations.")
      } finally {
        setLoading(false)
      }
    }
    fetchDonations()
  }, [])

  const handleUpdateStatus = async (donationId, newStatus) => {
    try {
      const donationRef = doc(db, "publicDonations", donationId)
      await updateDoc(donationRef, { status: newStatus })
      setDonations((prevDonations) => prevDonations.map((d) => (d.id === donationId ? { ...d, status: newStatus } : d)))
      if (selectedDonation && selectedDonation.id === donationId) {
        setSelectedDonation((prev) => ({ ...prev, status: newStatus }))
      }
    } catch (err) {
      console.error("Error updating donation status:", err)
      alert("Failed to update donation status.")
    }
  }

  const handleDeleteDonation = async (donationId) => {
    if (window.confirm("Are you sure you want to delete this donation record? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "publicDonations", donationId))
        setDonations((prevDonations) => prevDonations.filter((d) => d.id !== donationId))
        setIsViewDialogOpen(false) // Close dialog if the viewed donation is deleted
      } catch (err) {
        console.error("Error deleting donation:", err)
        alert("Failed to delete donation.")
      }
    }
  }

  const handleViewDonation = (donation) => {
    setSelectedDonation(donation)
    setIsViewDialogOpen(true)
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "pending_payment":
      case "pending_pickup":
        return "yellow"
      case "completed":
      case "picked_up":
        return "green"
      case "cancelled":
        return "red"
      default:
        return "outline"
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc") // Default to ascending when changing sort column
    }
  }

  const filteredAndSortedDonations = useMemo(() => {
    const filtered = donations.filter((donation) => {
      // Filter by type
      if (filterType !== "all" && donation.donationType !== filterType) {
        return false
      }
      // Filter by status
      if (filterStatus !== "all" && donation.status !== filterStatus) {
        return false
      }
      // Filter by search term (donor name)
      if (searchTerm) {
        const fullName = `${donation.firstName} ${donation.lastName}`.toLowerCase()
        if (!fullName.includes(searchTerm.toLowerCase())) {
          return false
        }
      }
      return true
    })

    // Sort data
    filtered.sort((a, b) => {
      let valA, valB

      switch (sortBy) {
        case "timestamp":
          valA = new Date(a.timestamp).getTime()
          valB = new Date(b.timestamp).getTime()
          break
        case "donationAmount":
          valA = Number(a.donationAmount || 0)
          valB = Number(b.donationAmount || 0)
          break
        case "clothesQty":
          valA = Number(a.clothesQty || 0)
          valB = Number(b.clothesQty || 0)
          break
        case "foodQty":
          valA = Number(a.foodQty || 0)
          valB = Number(b.foodQty || 0)
          break
        default:
          valA = a[sortBy]
          valB = b[sortBy]
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1
      if (valA > valB) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [donations, filterType, filterStatus, searchTerm, sortBy, sortOrder])

  if (loading) {
    return <div className="text-center py-8">Loading donations...</div>
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">Error: {error}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Donations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="search-donor">Search Donor</Label>
            <Input
              id="search-donor"
              placeholder="Search by donor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="filter-type">Filter by Type</Label>
            <Select onValueChange={setFilterType} value={filterType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="money">Money</SelectItem>
                <SelectItem value="clothes">Clothes</SelectItem>
                <SelectItem value="food">Food</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[150px]">
            <Label htmlFor="filter-status">Filter by Status</Label>
            <Select onValueChange={setFilterStatus} value={filterStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="pending_pickup">Pending Pickup</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredAndSortedDonations.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No donation records found matching your criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("firstName")}>
                      Donor Name
                      {sortBy === "firstName" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("donationType")}>
                      Type
                      {sortBy === "donationType" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("donationAmount")}>
                      Amount/Details
                      {sortBy === "donationAmount" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("status")}>
                      Status
                      {sortBy === "status" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  </TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("timestamp")}>
                      Date
                      {sortBy === "timestamp" &&
                        (sortOrder === "asc" ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ))}
                    </Button>
                  </TableHead>
                  {/* Placeholder for Fundraiser/Request ID */}
                  <TableHead>Fundraiser/Request ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedDonations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      {donation.firstName} {donation.lastName}
                    </TableCell>
                    <TableCell className="capitalize">{donation.donationType}</TableCell>
                    <TableCell>
                      {donation.donationType === "money" && `Rs. ${Number(donation.donationAmount).toLocaleString()}`}
                      {donation.donationType === "clothes" && `${donation.clothesQty} items`}
                      {donation.donationType === "food" && `${donation.foodQty} (${donation.foodType})`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(donation.status)}>
                        {donation.status?.replace(/_/g, " ") || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {donation.donationType === "money" ? (
                        <Badge variant={donation.isPaid ? "green" : "red"}>{donation.isPaid ? "Paid" : "Unpaid"}</Badge>
                      ) : (
                        <Badge variant="outline">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell>{donation.timestamp}</TableCell>
                    <TableCell>{donation.fundraiserId || donation.requestId || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2" onClick={() => handleViewDonation(donation)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteDonation(donation.id)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {selectedDonation && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Donation Details</DialogTitle>
              <DialogDescription>ID: {selectedDonation.id}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3 text-sm">
              <p>
                <strong>Donor:</strong> {selectedDonation.firstName} {selectedDonation.lastName}
              </p>
              <p>
                <strong>Contact:</strong> {selectedDonation.phone}
              </p>
              <p>
                <strong>Address:</strong> {selectedDonation.address}, {selectedDonation.city}, {selectedDonation.state},{" "}
                {selectedDonation.postcode}
              </p>
              <p>
                <strong>Donation Type:</strong> <span className="capitalize">{selectedDonation.donationType}</span>
              </p>
              {selectedDonation.donationType === "money" && (
                <p>
                  <strong>Amount:</strong> Rs. {Number(selectedDonation.donationAmount).toLocaleString()}
                </p>
              )}
              {selectedDonation.donationType === "clothes" && (
                <>
                  <p>
                    <strong>Clothes Description:</strong> {selectedDonation.clothesDesc}
                  </p>
                  <p>
                    <strong>Clothes Quantity:</strong> {selectedDonation.clothesQty} items
                  </p>
                </>
              )}
              {selectedDonation.donationType === "food" && (
                <>
                  <p>
                    <strong>Food Type:</strong> {selectedDonation.foodType}
                  </p>
                  <p>
                    <strong>Food Quantity:</strong> {selectedDonation.foodQty}
                  </p>
                  <p>
                    <strong>Food Expiry:</strong> {new Date(selectedDonation.foodExpiry).toLocaleDateString()}
                  </p>
                </>
              )}
              <p>
                <strong>Current Status:</strong>{" "}
                <Badge variant={getStatusBadgeVariant(selectedDonation.status)}>
                  {selectedDonation.status?.replace(/_/g, " ")}
                </Badge>
              </p>
              {selectedDonation.donationType === "money" && (
                <p>
                  <strong>Payment Status:</strong>{" "}
                  <Badge variant={selectedDonation.isPaid ? "green" : "red"}>
                    {selectedDonation.isPaid ? "Paid" : "Unpaid"}
                  </Badge>
                </p>
              )}
              <p>
                <strong>Submitted On:</strong> {selectedDonation.timestamp}
              </p>
              {/* Display Fundraiser/Request ID if available */}
              {(selectedDonation.fundraiserId || selectedDonation.requestId) && (
                <p>
                  <strong>Linked ID:</strong> {selectedDonation.fundraiserId || selectedDonation.requestId}
                </p>
              )}

              <div className="pt-4">
                <Label htmlFor="status-select">Update Status:</Label>
                <Select
                  id="status-select"
                  onValueChange={(value) => handleUpdateStatus(selectedDonation.id, value)}
                  value={selectedDonation.status}
                >
                  <SelectTrigger className="w-[180px] mt-2">
                    <SelectValue placeholder="Change Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_payment">Pending Payment</SelectItem>
                    <SelectItem value="pending_pickup">Pending Pickup</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteDonation(selectedDonation.id)}>
                Delete Record
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
