import * as React from "react";
import { ILead } from "@/types/leads";
import { ICustomer } from "@/types/customer";
import { OrderCreation } from "@/types/customer";

interface ContactUs {
  name?: string;
  email?: string;
  contactNo?: string;
  companyName?: string;
  form?: number;
  message?: string;
  replies?: string[];
}

interface Scholarship {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  category?: string;
  US_citizen?: boolean;
  training?: string[];
}

type LeadData = ContactUs | ICustomer | OrderCreation | Scholarship | null;

export const Customer: React.FC<{ selectedLead: ILead }> = ({
  selectedLead,
}) => {
  // Identify the populated object dynamically
  const populatedKey = [
    "contact_us",
    "free_signup",
    "order_creation",
    "abandoned_cart",
    "scholarship",
  ].find((key) => selectedLead[key as keyof ILead]);

  const leadData: LeadData = populatedKey
    ? (selectedLead[populatedKey as keyof ILead] as LeadData)
    : null;

  // console.log("Customer Component - Lead Data:", leadData);
  // console.log("Customer Component - Populated Key:", populatedKey);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">
        Customer Information
      </h3>
      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {populatedKey === "free_signup" &&
            leadData &&
            isCustomer(leadData) && (
              <>
                <Field label="First Name" value={leadData?.firstName} />
                <Field label="Last Name" value={leadData?.lastName} />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact No" value={leadData?.contactNo} />
              </>
            )}

          {(populatedKey === "order_creation" ||
            populatedKey === "abandoned_cart") &&
            leadData &&
            isOrderCreation(leadData) && (
              <>
                <Field
                  label="Full Name"
                  value={`${leadData?.firstName ?? ""} ${
                    leadData?.lastName ?? ""
                  }`}
                />
                {/* <Field label="Last Name" value={leadData?.lastName} /> */}
                <Field label="Order Id" value={leadData?.order_id} />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact No" value={leadData?.contactNo} />
                <Field label="Address" value={leadData?.address} />
                <Field label="State" value={leadData?.state} />
                <Field label="City" value={leadData?.city} />
                <Field label="Country" value={leadData?.country} />
                <Field label="Zip Code" value={leadData?.zipCode} />
              </>
            )}

          {populatedKey === "contact_us" &&
            leadData &&
            isContactUs(leadData) && (
              <>
                <Field label="Name" value={leadData?.name} />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact Number" value={leadData?.contactNo} />
                <Field label="Company Name" value={leadData?.companyName} />
                {leadData?.form === 1 && (
                  <Field label="Message" value={leadData?.message} />
                )}
                {leadData?.form === 2 && (
                  <Field
                    label="Replies"
                    value={
                      leadData?.replies && leadData?.replies.length > 0
                        ? leadData?.replies.join(", ")
                        : "No Replies"
                    }
                  />
                )}
              </>
            )}

          {populatedKey === "scholarship" &&
            leadData &&
            isScholarship(leadData) && (
              <>
                <Field
                  label="Full Name"
                  value={`${leadData?.firstName ?? ""} ${
                    leadData?.lastName ?? ""
                  }`}
                />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact Number" value={leadData?.phone} />
                <Field label="Category" value={leadData?.category} />
                <Field
                  label="Trainings"
                  value={
                    Array.isArray(leadData?.training) ? (
                      <ul className="list-disc pl-5">
                        {leadData.training.map((t, index) => (
                          <li key={index}>{t}</li>
                        ))}
                      </ul>
                    ) : (
                      "N/A"
                    )
                  }
                />
                <Field
                  label="US Citizen"
                  value={leadData?.US_citizen ? "Yes" : "No"}
                />
              </>
            )}

          {!populatedKey && (
            <p className="text-gray-500">No customer information available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string | number | null | string[] | undefined | React.ReactNode;
}

// Field Component with Proper Types
export const Field: React.FC<FieldProps> = ({ label, value }) => (
  <div>
    <h4 className="text-sm font-medium text-gray-500">{label}</h4>
    <p className="mt-1 text-gray-900">{value || "N/A"}</p>
  </div>
);

// Type Guards
function isCustomer(data: LeadData): data is ICustomer | OrderCreation {
  return data !== null && typeof data === "object" && "firstName" in data;
}

function isOrderCreation(data: LeadData): data is OrderCreation {
  return (
    data !== null &&
    typeof data === "object" &&
    ("order_id" in data || "items" in data)
  );
}

function isContactUs(data: LeadData): data is ContactUs {
  return (
    data !== null &&
    typeof data === "object" &&
    !("firstName" in data) &&
    "form" in data
  );
}

function isScholarship(data: LeadData): data is Scholarship {
  return (
    data !== null &&
    typeof data === "object" &&
    "firstName" in data &&
    "training" in data
  );
}
