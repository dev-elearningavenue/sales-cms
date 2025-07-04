// src/app/leads/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import LeadsTable from "@/components/LeadsTable";
import Head from "next/head";
import { ILead } from "@/types/leads";
import { useApp } from "@/contexts/AppContext";
import { Plus, X } from "lucide-react";
import { CourseInterest } from "@/models/customLead";
import { useSocket } from "@/hooks/useSocket";

const Leads = () => {
  const [leads, setLeads] = useState<ILead[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const { session, addNotification } = useApp();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNo: "",
    domain: "OOR",
    supportType: "call",
    coursesInterested: [] as CourseInterest[],
  });
  const [currentCourse, setCurrentCourse] = useState({
    courseName: "",
    quantity: 1,
  });

  // Course search functionality
  const [courseSearchResults, setCourseSearchResults] = useState<any[]>([]);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [courseSearchLoading, setCourseSearchLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  // Initialize WebSocket connection with event handlers
  const { isConnected } = useSocket({
    onNewLead: (data) => {
      const newLead = data.lead;
      // Check if this lead already exists in our list
      if (!leads.some((lead) => lead._id === newLead._id)) {
        setLeads((prevLeads) => [newLead, ...prevLeads]);
        addNotification({
          message: `New lead added: ${getLeadName(newLead)}`,
          read: false,
          type: "lead",
          leadId: newLead._id,
        });
      }
    },
    onLeadAssigned: (data) => {
      const updatedLead = data.lead;
      // Update lead assignment status
      setLeads((prevLeads) =>
        prevLeads.map((lead) => {
          if (lead._id === updatedLead._id) {
            return {
              ...lead,
              assigned: true,
              assigned_to: updatedLead.assigned_to,
              assignedAt: updatedLead.assignedAt,
            };
          }
          return lead;
        })
      );
    },
    onLeadDeleted: (data) => {
      const deletedLeadId = data.leadId;
      // Remove deleted lead
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => lead._id !== deletedLeadId)
      );
    },
  });

  useEffect(() => {
    fetchLeads();
    // We can still keep polling as a fallback mechanism, but with a longer interval
    const intervalId = setInterval(() => {
      if (!isConnected && session && session._id) {
        // Only use polling when WebSocket is not connected AND session is valid
        fetchLeadsUpdates();
      }
    }, 60000 * 5); // Check for updates every 60 seconds as a fallback

    return () => clearInterval(intervalId);
  }, [isConnected, session]);

  const fetchLeads = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setBackgroundLoading(true);
      } else {
        setLoading(true);
      }
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (!Array.isArray(data.leads)) {
        console.error(data);
        setLeads([]);
        return;
      }

      // Filter out contact_us leads with form=2
      const filteredLeads = data.leads.filter((lead: ILead) => {
        // Exclude leads that are Contact Us category with form=2
        if (
          lead.category === "Contact Us" &&
          lead.contact_us &&
          typeof lead.contact_us === "object" &&
          (lead.contact_us as any).form === 2
        ) {
          return false; // Skip these leads
        }
        return true; // Include all other leads
      });

      setLeads(filteredLeads);
      setLastFetchTime(new Date());
    } catch (error) {
      console.error("Error fetching leads:", error);
      if (isRefresh) {
        throw error; // Re-throw to let the table component handle the error notification
      }
    } finally {
      if (isRefresh) {
        setBackgroundLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchLeadsUpdates = async () => {
    if (!lastFetchTime) return;

    try {
      const timestamp = lastFetchTime.toISOString();
      const res = await fetch(`/api/leads/updates?since=${timestamp}`);

      // Check for auth errors
      if (res.status === 401) {
        console.log("Auth error in fetchLeadsUpdates, user needs to re-login");
        return;
      }

      const data = await res.json();

      if (data.newLeads && data.newLeads.length > 0) {
        // Add the new leads to the state
        setLeads((prevLeads) => {
          // Filter out any duplicates by ID
          const existingIds = new Set(prevLeads.map((lead) => lead._id));
          const uniqueNewLeads = data.newLeads.filter(
            (lead: ILead) => !existingIds.has(lead._id)
          );

          // Notify for each new lead
          uniqueNewLeads.forEach((lead: ILead) => {
            addNotification({
              message: `New lead added: ${getLeadName(lead)}`,
              read: false,
              type: "lead",
              leadId: lead._id,
            });
          });

          // Update last fetch time
          setLastFetchTime(new Date());

          // Return updated leads array with new leads at the top
          return [...uniqueNewLeads, ...prevLeads];
        });
      }
    } catch (error) {
      console.error("Error fetching lead updates:", error);
    }
  };

  // Helper function to get lead name
  const getLeadName = (lead: ILead): string => {
    if (
      lead.contact_us &&
      typeof lead.contact_us === "object" &&
      (lead.contact_us as any).name
    ) {
      return (lead.contact_us as any).name;
    }

    const dataObjects = [
      lead.free_signup,
      lead.order_creation,
      lead.scholarship,
      lead.custom_lead,
      lead.abandoned_cart,
    ];

    for (const obj of dataObjects) {
      if (
        obj &&
        typeof obj === "object" &&
        "firstName" in obj &&
        "lastName" in obj
      ) {
        return `${(obj as any).firstName} ${(obj as any).lastName || ""}`;
      }
    }

    return "New Lead";
  };

  const handleDelete = async (
    leadId: string,
    isBatchOperation: boolean = false
  ) => {
    try {
      const res = await fetch(`/api/leads?leadId=${leadId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete lead");
      }

      // Don't need to update state since WebSocket will handle this
      // But as a fallback, let's update it locally too
      setLeads((prevLeads) => prevLeads.filter((lead) => lead._id !== leadId));

      // Skip individual notifications for batch operations
      if (!isBatchOperation) {
        // Show success notification
        addNotification({
          message: "Lead deleted successfully",
          type: "info",
          read: false,
        });
      }

      return true;
    } catch (error) {
      console.error("Error deleting lead:", error);
      addNotification({
        message: "Failed to delete lead",
        type: "warning",
        read: false,
      });
      return false;
    }
  };

  // Add batch delete function
  const handleBatchDelete = async (leadIds: string[]) => {
    try {
      const res = await fetch("/api/leads?batch=true", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadIds }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete leads");
      }

      const data = await res.json();

      // Update state to remove deleted leads
      setLeads((prevLeads) =>
        prevLeads.filter((lead) => !leadIds.includes(lead._id as string))
      );

      // Show success notification
      addNotification({
        message:
          data.message || `${data.deletedCount} leads deleted successfully`,
        type: "info",
        read: false,
      });

      return true;
    } catch (error) {
      console.error("Error batch deleting leads:", error);
      addNotification({
        message: "Failed to delete leads",
        type: "warning",
        read: false,
      });
      return false;
    }
  };

  const handleAssign = async (
    leadId: string,
    userId?: string,
    isBatchOperation = false
  ) => {
    try {
      // console.log(`Assigning Lead: ${leadId}${userId ? ` to user: ${userId}` : ""}`);

      const res = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, userId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Update handled by WebSocket, but as fallback also update here
        setLeads((prevLeads) => {
          return prevLeads.map((lead) => {
            if (lead._id === leadId) {
              // Create a copy of the lead to modify
              const updatedLead = { ...lead };
              updatedLead.assigned = true;
              updatedLead.assignedAt = new Date();
              // Use the returned user data from the API
              if (data.assignedTo) {
                // Type assertion to any to avoid TypeScript errors
                (updatedLead as any).assigned_to = data.assignedTo;
              } else if (session?._id) {
                // Fallback to session data if API doesn't return user details
                (updatedLead as any).assigned_to = {
                  _id: session._id,
                  full_name: session.full_name || "User",
                  user_name: session.user_name || "User",
                };
              }
              return updatedLead;
            }
            return lead;
          });
        });

        // Skip individual notifications for batch operations
        if (!isBatchOperation) {
          let leadName = "";
          const lead = leads.find((l) => l._id === leadId);
          if (lead) {
            leadName = getLeadName(lead);
          }

          const assignedToUser = userId
            ? `assigned to ${data.assignedTo?.full_name || "another user"}`
            : "assigned";

          addNotification({
            message: `Lead ${assignedToUser}: ${leadName}`,
            type: "info",
            read: false,
          });
        }

        return true; // Assignment successful
      } else {
        // Handle assignment error
        if (res.status === 409) {
          // Lead already assigned
          alert(
            data.error || "This lead has already been assigned to another user."
          );
        } else {
          alert(data.error || data.message || "Failed to assign lead.");
        }
        return false; // Assignment failed
      }
    } catch (error) {
      console.error("Error while assigning lead:", error);
      return false;
    }
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewLeadForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear course search when domain changes
    if (name === "domain") {
      setShowCourseDropdown(false);
      setCourseSearchResults([]);
      setCurrentCourse((prev) => ({ ...prev, courseName: "" }));
    }

    // Clear error for field when user types
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Course search function
  const searchCourses = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setCourseSearchResults([]);
      setShowCourseDropdown(false);
      return;
    }

    setCourseSearchLoading(true);
    try {
      const siteCode = "001"; // Use selected domain
      const response = await fetch(
        "https://freeoshacourses.com/api/api_search_products.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_name: siteCode,
            q: query,
          }),
        }
      );

      const data = await response.json();

      if (
        data.status === true &&
        Array.isArray(data.data) &&
        data.data.length > 0
      ) {
        console.log("Setting course results and showing dropdown");
        setCourseSearchResults(data.data);
        setShowCourseDropdown(true);
      } else {
        setCourseSearchResults([]);
        setShowCourseDropdown(false);
      }
    } catch (error) {
      console.error("Error searching courses:", error);
      setCourseSearchResults([]);
      setShowCourseDropdown(false);
    } finally {
      setCourseSearchLoading(false);
    }
  };

  // Debounced search
  const debounceSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => searchCourses(query), 300);
    };
  }, [newLeadForm.domain]);

  // Handle course input changes
  const handleCourseInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCurrentCourse((prev) => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value,
    }));

    // Trigger search for course name
    if (name === "courseName") {
      debounceSearch(value);
    }
  };

  // Handle course selection from dropdown
  const selectCourse = (course: any) => {
    console.log(course);
    setCurrentCourse((prev) => ({
      ...prev,
      courseName: course.product_name,
    }));
    setShowCourseDropdown(false);
    setCourseSearchResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showCourseDropdown &&
        !(event.target as Element).closest(".course-search-container")
      ) {
        setShowCourseDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCourseDropdown]);

  // Add course to the list
  const addCourse = () => {
    if (!currentCourse.courseName.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        courseName: "Course name is required",
      }));
      return;
    }

    setNewLeadForm((prev) => ({
      ...prev,
      coursesInterested: [...prev.coursesInterested, { ...currentCourse }],
    }));

    setCurrentCourse({ courseName: "", quantity: 1 });

    // Clear course error
    if (formErrors.courseName) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.courseName;
        return newErrors;
      });
    }
  };

  // Remove course from the list
  const removeCourse = (index: number) => {
    setNewLeadForm((prev) => ({
      ...prev,
      coursesInterested: prev.coursesInterested.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!newLeadForm.firstName.trim())
      errors.firstName = "First name is required";
    if (!newLeadForm.lastName.trim()) errors.lastName = "Last name is required";
    if (!newLeadForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(newLeadForm.email)) {
      errors.email = "Email is invalid";
    }
    if (!newLeadForm.contactNo.trim())
      errors.contactNo = "Contact number is required";
    if (newLeadForm.coursesInterested.length === 0) {
      errors.courses = "At least one course is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/leads/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newLeadForm),
      });

      const data = await response.json();

      if (response.ok) {
        // Successfully created lead - update is handled by WebSocket
        // but as fallback, also update state
        if (data.lead) {
          setLeads((prev) => [data.lead, ...prev]);

          // Add notification for new lead
          addNotification({
            message: `New lead created: ${data.lead.custom_lead.firstName} ${data.lead.custom_lead.lastName}`,
            read: false,
            type: "lead",
            leadId: data.lead._id,
          });
        }

        resetForm();
        setIsCreateModalOpen(false);
      } else {
        // Handle API errors
        setFormErrors({
          submit: data.message || "Failed to create lead",
        });
      }
    } catch (error) {
      console.error("Error creating lead:", error);
      setFormErrors({
        submit: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewLeadForm({
      firstName: "",
      lastName: "",
      email: "",
      contactNo: "",
      domain: "OOR",
      supportType: "call",
      coursesInterested: [],
    });
    setCurrentCourse({
      courseName: "",
      quantity: 1,
    });
    setFormErrors({});
  };

  return (
    <>
      <Head>
        <title>All Leads | Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        {loading ? (
          <LoadingSkeleton component="All Leads" />
        ) : (
          <LeadsTable
            leads={leads}
            onAssign={handleAssign}
            title="All Leads"
            showCreateButton={true}
            onCreateClick={() => setIsCreateModalOpen(true)}
            onDelete={handleDelete}
            onBatchDelete={handleBatchDelete}
            onRefresh={() => fetchLeads(true)}
          />
        )}
      </div>

      {/* Create Lead Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-auto">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">
                Create New Lead
              </h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {formErrors.submit && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  {formErrors.submit}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={newLeadForm.firstName}
                    onChange={handleInputChange}
                    className={`w-full p-2 border ${
                      formErrors.firstName
                        ? "border-red-500"
                        : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name*
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={newLeadForm.lastName}
                    onChange={handleInputChange}
                    className={`w-full p-2 border ${
                      formErrors.lastName ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.lastName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email*
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={newLeadForm.email}
                    onChange={handleInputChange}
                    className={`w-full p-2 border ${
                      formErrors.email ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number*
                  </label>
                  <input
                    type="text"
                    name="contactNo"
                    value={newLeadForm.contactNo}
                    onChange={handleInputChange}
                    className={`w-full p-2 border ${
                      formErrors.contactNo
                        ? "border-red-500"
                        : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.contactNo && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.contactNo}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain*
                  </label>
                  <select
                    name="domain"
                    value={newLeadForm.domain}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="OOR">Osha Outreach</option>
                    <option value="OOC">Osha Online Center</option>
                    <option value="OES">Osha Education School</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Support Type*
                  </label>
                  <select
                    name="supportType"
                    value={newLeadForm.supportType}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="call">Call</option>
                    <option value="chat">Chat</option>
                    <option value="email">Email</option>
                  </select>
                </div>
              </div>

              {/* Courses Section in Custom Lead Form */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Courses Interested*
                </label>

                {formErrors.courses && (
                  <p className="mt-1 text-sm text-red-600 mb-2">
                    {formErrors.courses}
                  </p>
                )}

                {/* Added Courses Display */}
                {newLeadForm.coursesInterested.length > 0 && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 rounded-md p-3">
                    <h4 className="font-medium mb-2">Selected Courses:</h4>
                    <div className="space-y-2">
                      {newLeadForm.coursesInterested.map((course, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white p-2 rounded border"
                        >
                          <span className="font-medium">
                            {course.courseName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              Qty: {course.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCourse(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Course Search Input */}
                <div className="flex flex-col md:flex-row gap-2">
                  <div className="flex-grow relative course-search-container">
                    <input
                      type="text"
                      name="courseName"
                      placeholder="Type to search courses..."
                      value={currentCourse.courseName}
                      onChange={handleCourseInputChange}
                      className={`w-full p-2 border ${
                        formErrors.courseName
                          ? "border-red-500"
                          : "border-gray-300"
                      } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />

                    {/* Loading indicator */}
                    {courseSearchLoading && (
                      <div className="absolute right-3 top-3">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}

                    {/* Search Results Dropdown */}
                    {showCourseDropdown && courseSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {courseSearchResults.map((course, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => selectCourse(course)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">
                              {course.product_name}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {formErrors.courseName && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.courseName}
                      </p>
                    )}
                  </div>

                  <div className="w-full md:w-24">
                    <input
                      type="number"
                      name="quantity"
                      min="1"
                      placeholder="Qty"
                      value={currentCourse.quantity}
                      onChange={handleCourseInputChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addCourse}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
                  >
                    Add Course
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Leads;
