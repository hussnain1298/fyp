import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, firestore } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { Poppins } from "next/font/google";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"] });

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editService, setEditService] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      setError("");

      const user = auth.currentUser;
      if (!user) {
        setError("You must be logged in to view services.");
        return;
      }

      try {
        const q = query(
          collection(firestore, "services"),
          where("orphanageId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const serviceList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setServices(serviceList);
      } catch (err) {
        setError("Failed to load services: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleEditClick = (service) => {
    setEditService(service);
    setIsEditing(true);
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    const { title, description, status } = editService;

    try {
      const serviceRef = doc(firestore, "services", editService.id);
      await updateDoc(serviceRef, { title, description, status });

      setServices((prevServices) =>
        prevServices.map((svc) =>
          svc.id === editService.id
            ? { ...svc, title, description, status }
            : svc
        )
      );

      setIsEditing(false);
    } catch (err) {
      setError("Failed to update service: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) return;

    try {
      await deleteDoc(doc(firestore, "services", id));
      setServices((prev) => prev.filter((service) => service.id !== id));
    } catch (err) {
      alert("Failed to delete service: " + err.message);
    }
  };

  return (
    <div className={`${poppins.className} bg-white min-h-screen`}>
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-black font-bold">Services</h1>
          <button
            type="button"
            className="bg-green-600 text-white font-medium py-2 px-4 rounded-md mt-12"
            onClick={() => router.push("/add-services")}
          >
            + Add a Service
          </button>
        </div>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-gray-500 text-center mt-4">Loading...</p>}

        <div className="mt-6">
          {services.length === 0 && !loading ? (
            <p className="text-center text-xl text-gray-500">No services yet.</p>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div key={service.id} className="bg-gray-100 p-4 rounded-lg shadow-md">
                  <h2 className="text-lg font-bold">{service.title}</h2>
                  <p className="text-gray-700">{service.description}</p>
                  <p className="mt-2 text-sm">
                    <strong>Service ID:</strong> {service.id}
                  </p>
                  <p className="mt-1 text-sm">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-md ${
                        service.status === "Pending" ? "bg-yellow-400" : "bg-green-500"
                      } text-white`}
                    >
                      {service.status}
                    </span>
                  </p>

                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleEditClick(service)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isEditing && (
          <div className="fixed inset-0 flex justify-center items-center bg-gray-800 bg-opacity-50">
            <div className="bg-white p-8 rounded-lg shadow-lg w-[400px]">
              <h2 className="text-2xl font-bold mb-4">Edit Service</h2>

              <form onSubmit={handleSaveChanges}>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Title</label>
                  <input
                    type="text"
                    value={editService.title}
                    onChange={(e) =>
                      setEditService({ ...editService, title: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    value={editService.description}
                    onChange={(e) =>
                      setEditService({ ...editService, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2">Status</label>
                  <select
                    value={editService.status}
                    onChange={(e) =>
                      setEditService({ ...editService, status: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="Pending">Pending</option>
                    <option value="Fulfilled">Fulfilled</option>
                  </select>
                </div>

                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;
