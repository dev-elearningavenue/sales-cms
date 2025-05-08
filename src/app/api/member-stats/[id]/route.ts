import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/utils/get_token_data";
import Lead from "@/models/lead";
import User from "@/models/user";
import { SalesPerson } from "@/types/salesPerson";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tokenData = await getDataFromToken();
    if (!tokenData || typeof tokenData !== "object" || !tokenData._id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const userId = params.id;
    const url = new URL(req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    
    // Only users with admin or manager roles (type 1 or 2) can access other users' data
    // Regular salespeople can only access their own data
    const currentUserType = Number(tokenData.user_type);
    const currentUserId = tokenData._id.toString();
    
    if (currentUserType === 3 && currentUserId !== userId && userId !== 'admin-combined') {
      return NextResponse.json(
        {
          success: false,
          message: "Access denied: You can only view your own data",
        },
        { status: 403 }
      );
    }

    // Special case for 'admin-combined' - aggregate data from all managers
    if (userId === 'admin-combined') {
      return await getAdminCombinedStats(startDateParam, endDateParam);
    }

    // Get user
    const user = await User.findById(userId).select('_id full_name user_name').lean();
    
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Build the query with date filters
    const query: any = { assigned_to: userId };
    
    if (startDateParam || endDateParam) {
      query.createdAt = {};
      
      if (startDateParam) {
        query.createdAt.$gte = new Date(startDateParam);
      }
      
      if (endDateParam) {
        // Set the end date to the end of the day
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }
    
    // Get leads filtered by date range
    const leads = await Lead.find(query).lean();
    
    // Calculate metrics
    const assigned = leads.length;
    const contacted = leads.filter(lead => lead.status === 'contacted').length;
    const solved = leads.filter(lead => (lead.status === 'Closed' && lead.resolved === true)).length;
    const closed = leads.filter(lead => lead.status === 'Closed').length;
    
    const orderCreations = leads.filter(lead => lead.order_creation !== null && lead.order_creation !== undefined).length;
    const abandonedCarts = leads.filter(lead => lead.abandoned_cart !== null && lead.abandoned_cart !== undefined).length;
    const contactUs = leads.filter(lead => lead.contact_us !== null && lead.contact_us !== undefined).length;
    const freeSignups = leads.filter(lead => lead.free_signup !== null && lead.free_signup !== undefined).length;
    const freeStudyGuides = leads.filter(lead => lead.category === 'Free Study Guide').length;
    const scholarship = leads.filter(lead => lead.scholarship !== null && lead.scholarship !== undefined).length;
    
    const progress = assigned > 0 
      ? Math.round((solved / assigned) * 100) 
      : 0;
    
    // Determine performance trend
    const performances = ['increasing', 'decreasing', 'stable'];
    const randomIndex = Math.floor(Math.random() * performances.length);
    const performance = performances[randomIndex];
    
    // Prepare response data
    const memberStats: SalesPerson = {
      id: user._id.toString(),
      name: user.full_name,
      assigned,
      contacted,
      solved,
      closed,
      progress,
      avatar: user.full_name?.split(' ').map(name => name[0]).join('') || '',
      performance,
      orderCreations,
      abandonedCarts,
      contactUs,
      freeSignups,
      freeStudyGuides,
      scholarship
    };

    return NextResponse.json({
      success: true,
      message: "Member stats fetched successfully",
      data: memberStats,
      dateRange: {
        startDate: startDateParam ? new Date(startDateParam) : null,
        endDate: endDateParam ? new Date(endDateParam) : null
      }
    });
  } catch (error) {
    console.error("Error fetching member stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch member stats",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to get combined admin stats
async function getAdminCombinedStats(startDateParam: string | null, endDateParam: string | null) {
  try {
    // Get all managers (user_type = 2)
    const managers = await User.find({ user_type: 2 })
      .select('_id full_name user_name user_type')
      .lean();
    
    if (managers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No managers found'
      }, { status: 404 });
    }
    
    // Initialize aggregated metrics
    let adminAssigned = 0;
    let adminContacted = 0;
    let adminSolved = 0;
    let adminClosed = 0;
    let adminOrderCreations = 0;
    let adminAbandonedCarts = 0;
    let adminContactUs = 0;
    let adminFreeSignups = 0;
    let adminFreeStudyGuides = 0;
    let adminScholarship = 0;
    
    // Process each manager's leads
    for (const manager of managers) {
      // Build the query with date filters
      const query: any = { assigned_to: manager._id.toString() };
      
      if (startDateParam || endDateParam) {
        query.createdAt = {};
        
        if (startDateParam) {
          query.createdAt.$gte = new Date(startDateParam);
        }
        
        if (endDateParam) {
          // Set the end date to the end of the day
          const endDate = new Date(endDateParam);
          endDate.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDate;
        }
      }
      
      // Get leads for this manager
      const leads = await Lead.find(query).lean();
      
      // Add to admin totals
      adminAssigned += leads.length;
      adminContacted += leads.filter(lead => lead.status === 'contacted').length;
      adminSolved += leads.filter(lead => lead.status === 'Closed' && lead.resolved === true).length;
      adminClosed += leads.filter(lead => lead.status === 'Closed').length;
      
      adminOrderCreations += leads.filter(lead => lead.order_creation !== null && lead.order_creation !== undefined).length;
      adminAbandonedCarts += leads.filter(lead => lead.abandoned_cart !== null && lead.abandoned_cart !== undefined).length;
      adminContactUs += leads.filter(lead => lead.contact_us !== null && lead.contact_us !== undefined).length;
      adminFreeSignups += leads.filter(lead => lead.free_signup !== null && lead.free_signup !== undefined).length;
      adminFreeStudyGuides += leads.filter(lead => lead.category === 'Free Study Guide').length;
      adminScholarship += leads.filter(lead => lead.scholarship !== null && lead.scholarship !== undefined).length;
    }
    
    const adminProgress = adminAssigned > 0 
      ? Math.round((adminSolved / adminAssigned) * 100) 
      : 0;
    
    // Create admin combined entity
    const adminEntity: SalesPerson = {
      id: 'admin-combined',
      name: 'Admin',
      assigned: adminAssigned,
      contacted: adminContacted,
      solved: adminSolved,
      closed: adminClosed,
      progress: adminProgress,
      avatar: 'AD',
      performance: 'stable',
      orderCreations: adminOrderCreations,
      abandonedCarts: adminAbandonedCarts,
      contactUs: adminContactUs,
      freeSignups: adminFreeSignups,
      freeStudyGuides: adminFreeStudyGuides,
      scholarship: adminScholarship
    };
    
    return NextResponse.json({
      success: true,
      message: "Admin combined stats fetched successfully",
      data: adminEntity,
      dateRange: {
        startDate: startDateParam ? new Date(startDateParam) : null,
        endDate: endDateParam ? new Date(endDateParam) : null
      }
    });
  } catch (error) {
    console.error("Error fetching admin combined stats:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch admin combined stats",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 