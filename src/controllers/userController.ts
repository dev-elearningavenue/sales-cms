import User from "@/models/user";

/**
 * Gets users based on the current user's type/permissions
 * 
 * Type 1 (Admin) users can see type 2 and 3 users
 * Type 2 (Manager) / Type 5 (Pre Sale) users can only see type 3 users
 * Type 3 (Agent) users can't see any users
 */
export const getUsers = async (userId: string, userType: number) => {
  try {
    let query: any = {};
    
    if (userType === 1) {
      query.user_type = { $in: [2, 3] };
    }
    else if (userType === 2 || userType === 5) {
      query.user_type = 3;
    }
    else {
      return { success: true, users: [] };
    }
    // Get users but exclude sensitive information
    const users = await User.find(query)
      .select('_id full_name user_type')
      .sort({ user_type: 1, full_name: 1 });

      if (!users || users.length === 0) {
        return { success: false, message: "No users found", users: [] };
      }

    return { success: true, message: "Users fetched successfully", users };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Failed to fetch users");
  }
};


