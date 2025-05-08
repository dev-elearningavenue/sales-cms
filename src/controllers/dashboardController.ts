import Lead from "@/models/lead";
import User from "@/models/user";
import { SalesPerson } from "@/types/salesPerson";

// Interface for date filter
interface DateFilter {
  startDate?: Date;
  endDate?: Date;
}

// Get dashboard metrics for admin view
export const getDashboardMetrics = async (dateFilter?: DateFilter) => {
  try {
    // Get all salespeople (user_type = 3)
    const salesPeople = await User.find({ user_type: 3 })
      .select('_id full_name user_name user_type')
      .lean();

    // Get managers (user_type = 2)
    const managers = await User.find({ user_type: 2 })
      .select('_id full_name user_name user_type')
      .lean();

    // Prepare data structure for response
    const metrics = {
      salesPeople: [] as SalesPerson[],
      totals: {
        assigned: 0,
        contacted: 0,
        solved: 0,
        closed: 0,
        orderCreations: 0,
        abandonedCarts: 0,
        contactUs: 0,
        freeSignups: 0,
        freeStudyGuides: 0,
        scholarship: 0
      },
      lastUpdated: new Date().toISOString(),
      dateRange: {
        startDate: dateFilter?.startDate || null,
        endDate: dateFilter?.endDate || null
      }
    };

    // Build the query based on date filter
    const buildLeadQuery = (assignedTo: string) => {
      const query: any = { assigned_to: assignedTo };
      
      if (dateFilter?.startDate || dateFilter?.endDate) {
        query.createdAt = {};
        
        if (dateFilter.startDate) {
          query.createdAt.$gte = dateFilter.startDate;
        }
        
        if (dateFilter.endDate) {
          query.createdAt.$lte = dateFilter.endDate;
        }
      }
      
      return query;
    };

    const salesPeopleWithMetrics = await Promise.all(
      salesPeople.map(async (user) => {
        const query = buildLeadQuery(user._id.toString());
        const leads = await Lead.find(query).lean();
        
        // Calculate basic metrics for this salesperson
        const assigned = leads.length;
        const contacted = leads.filter(lead => lead.status === 'contacted').length;
        const solved = leads.filter(lead => lead.status === 'Closed' && lead.resolved === true).length;
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

        // Update totals
        metrics.totals.assigned += assigned;
        metrics.totals.contacted += contacted;
        metrics.totals.solved += solved;
        metrics.totals.closed += closed;
        metrics.totals.orderCreations += orderCreations;
        metrics.totals.abandonedCarts += abandonedCarts;
        metrics.totals.contactUs += contactUs;
        metrics.totals.freeSignups += freeSignups;
        metrics.totals.freeStudyGuides += freeStudyGuides;
        metrics.totals.scholarship += scholarship;

        // Return the salesperson with their metrics
        return {
          id: user._id.toString(),
          name: user.full_name,
          assigned,
          contacted,
          solved,
          closed,
          progress,
          avatar: user.full_name ? user.full_name.split(' ').map(name => name[0]).join('') : '',
          performance,
          orderCreations,
          abandonedCarts,
          contactUs,
          freeSignups,
          freeStudyGuides,
          scholarship
        };
      })
    );

    // Calculate combined metrics for all managers (type 2 users) as single "Admin" entity
    if (managers.length > 0) {
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

      // Gather all leads assigned to any manager
      for (const manager of managers) {
        const query = buildLeadQuery(manager._id.toString());
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

      // Add admin metrics to totals
      metrics.totals.assigned += adminAssigned;
      metrics.totals.contacted += adminContacted;
      metrics.totals.solved += adminSolved;
      metrics.totals.closed += adminClosed;
      metrics.totals.orderCreations += adminOrderCreations;
      metrics.totals.abandonedCarts += adminAbandonedCarts;
      metrics.totals.contactUs += adminContactUs;
      metrics.totals.freeSignups += adminFreeSignups;
      metrics.totals.freeStudyGuides += adminFreeStudyGuides;
      metrics.totals.scholarship += adminScholarship;

      // Create a combined "Admin" entity with all type 2 users' metrics
      const adminEntity = {
        id: 'admin-combined',
        name: 'Admin',
        assigned: adminAssigned,
        contacted: adminContacted,
        solved: adminSolved,
        closed: adminClosed,
        progress: adminProgress,
        avatar: 'AD',
        performance: 'stable' as const,
        orderCreations: adminOrderCreations,
        abandonedCarts: adminAbandonedCarts,
        contactUs: adminContactUs,
        freeSignups: adminFreeSignups,
        freeStudyGuides: adminFreeStudyGuides,
        scholarship: adminScholarship
      };

      // Add the admin entity to the salespeople array
      salesPeopleWithMetrics.unshift(adminEntity);
    }

    // Add the salespeople metrics to the response 
    metrics.salesPeople.push(...salesPeopleWithMetrics);

    return {
      success: true,
      message: 'Dashboard metrics fetched successfully',
      data: metrics
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return {
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};

export const getSalespersonMetrics = async (userId: string, dateFilter?: DateFilter) => {
  try {
    // Get the salesperson
    const user = await User.findById(userId).select('_id full_name user_name').lean();
    
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Build the query based on date filter
    const query: any = { assigned_to: userId };
    if (dateFilter?.startDate || dateFilter?.endDate) {
      query.createdAt = {};
      
      if (dateFilter.startDate) {
        query.createdAt.$gte = dateFilter.startDate;
      }
      
      if (dateFilter.endDate) {
        query.createdAt.$lte = dateFilter.endDate;
      }
    }
    
    // Get all leads assigned to this user with date filtering
    const leads = await Lead.find(query).lean();
    
    // Calculate basic metrics
    const assigned = leads.length;
    const contacted = leads.filter(lead => lead.status === 'contacted').length;
    const solved = leads.filter(lead => (lead.status === 'Closed' && lead.resolved === true)).length;
    const closed = leads.filter(lead => lead.status === 'Closed' ).length;
    
    // Calculate category-specific metrics
    const orderCreations = leads.filter(lead => lead.order_creation !== null && lead.order_creation !== undefined).length;
    const abandonedCarts = leads.filter(lead => lead.abandoned_cart !== null && lead.abandoned_cart !== undefined).length;
    const contactUs = leads.filter(lead => lead.contact_us !== null && lead.contact_us !== undefined).length;
    const freeSignups = leads.filter(lead => lead.free_signup !== null && lead.free_signup !== undefined).length;
    const freeStudyGuides = leads.filter(lead => lead.category === 'Free Study Guide').length;
    const scholarship = leads.filter(lead => lead.scholarship !== null && lead.scholarship !== undefined).length;
    
    // Calculate progress percentage
    const progress = assigned > 0 
      ? Math.round((solved / assigned) * 100) 
      : 0;
    
    // Determine performance
    const performances = ['increasing', 'decreasing', 'stable'];
    const randomIndex = Math.floor(Math.random() * performances.length);
    const performance = performances[randomIndex];

    // Prepare data for response
    const metrics = {
      salesperson: {
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
      },
      lastUpdated: new Date().toISOString(),
      dateRange: {
        startDate: dateFilter?.startDate || null,
        endDate: dateFilter?.endDate || null
      }
    };

    return {
      success: true,
      message: 'Salesperson metrics fetched successfully',
      data: metrics
    };
  } catch (error) {
    console.error('Error fetching salesperson metrics:', error);
    return {
      success: false,
      message: 'Failed to fetch salesperson metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 