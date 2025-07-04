"use client";
import { useApp } from "@/contexts/AppContext";
import {
  User,
  Mail,
  UserCheck,
  Shield,
  Calendar,
  Settings,
} from "lucide-react";

const ProfilePage = () => {
  const { session, fetchSession, loading } = useApp();

  const getUserTypeLabel = (userType: number) => {
    switch (userType) {
      case 1:
        return "Admin";
      case 2:
        return "Manager";
      case 3:
        return "Sales Agent";
      default:
        return "Unknown";
    }
  };

  const getUserTypeColor = (userType: number) => {
    switch (userType) {
      case 1:
        return "bg-red-100 text-red-800 border-red-200";
      case 2:
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 3:
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your account information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
              {/* Avatar Section */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {session?.full_name || "User"}
                </h2>
                <div
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getUserTypeColor(
                    session?.user_type || 3
                  )}`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  {getUserTypeLabel(session?.user_type || 3)}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-600 dark:text-gray-300">
                    Username
                  </span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {session?.user_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center">
                <Settings className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />
                Account Details
              </h3>

              <div className="space-y-6">
                {/* Email Section */}
                <div className="flex items-start space-x-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                      Email Address
                    </h4>
                    <p className="text-gray-800 dark:text-gray-200">
                      {session?.email}
                    </p>
                  </div>
                </div>

                {/* Full Name Section */}
                <div className="flex items-start space-x-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                      Full Name
                    </h4>
                    <p className="text-gray-800 dark:text-gray-200">
                      {session?.full_name || "Not provided"}
                    </p>
                  </div>
                </div>

                {/* Username Section */}
                <div className="flex items-start space-x-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-1">
                      Username
                    </h4>
                    <p className="text-gray-800 dark:text-gray-200">
                      {session?.user_name}
                    </p>
                  </div>
                </div>

                {/* Role Section */}
                <div className="flex items-start space-x-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                      Role & Permissions
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium border ${getUserTypeColor(
                          session?.user_type || 3
                        )}`}
                      >
                        {getUserTypeLabel(session?.user_type || 3)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (Level {session?.user_type || 3})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Edit Profile
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    View Activity
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
