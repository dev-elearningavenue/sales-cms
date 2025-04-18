"use client";
import { useApp } from "@/contexts/AppContext";

const ProfilePage = () => {
  const { session, fetchSession, loading } = useApp();

  // console.log("Profile Page: ", session);
  return session ? (
    <div className="min-h-screen p-6 bg-gray-100">
      <h2 className="text-3xl mb-6">Profile</h2>
      <p>
        <strong>Email:</strong> {session.email}
      </p>
    </div>
  ) : (
    <p>Please login to view your profile.</p>
  );
};

export default ProfilePage;
