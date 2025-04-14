export default function UnauthorizedPage() {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-bold text-red-600">🚨 Unauthorized Access</h1>
          <p className="text-gray-700 mt-4">You do not have permission to access this page.</p>
          <a href="/login" className="mt-6 inline-block bg-blue-500 text-white px-4 py-2 rounded-md">
            Go to Login
          </a>
        </div>
      </div>
    );
  }
  