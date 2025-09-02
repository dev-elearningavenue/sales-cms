import * as React from "react";
import { ILead } from "@/types/leads";
import { ICustomer } from "@/types/customer";
import { OrderCreation } from "@/types/customer";
import { IInvoice } from "@/models/invoice";
import { getStateName } from "@/utils/stateMapping";

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

interface CustomLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNo?: string;
  supportType?: string;
}

type LeadData =
  | ContactUs
  | ICustomer
  | OrderCreation
  | Scholarship
  | CustomLead
  | null;

export const Customer: React.FC<{ selectedLead: ILead }> = ({
  selectedLead,
}) => {
  const [externalUserName, setExternalUserName] = React.useState<string | null>(null);
  const [isFetchingExternal, setIsFetchingExternal] = React.useState<boolean>(false);
  // Identify the populated object dynamically
  const populatedKey = [
    "contact_us",
    "free_signup",
    "order_creation",
    "abandoned_cart",
    "scholarship",
    "custom_lead",
    "invoice",
  ].find((key) => selectedLead[key as keyof ILead]);

  const leadData: LeadData = populatedKey
    ? (selectedLead[populatedKey as keyof ILead] as LeadData)
    : null;

  // console.log("Customer Component - Lead Data:", leadData);
  // console.log("Customer Component - Populated Key:", populatedKey);

  // When order_creation exists and contains a user with _id but missing userName, fetch from external DB
  React.useEffect(() => {
    const orderData = (selectedLead?.order_creation as any) || null;
    const userRef = orderData?.user;
    const userId = typeof userRef === "string" ? userRef : userRef?._id || userRef?.id;
    const existingUserName = typeof userRef === "object" ? (userRef?.userName || userRef?.full_name) : undefined;
    const domainCode = selectedLead?.domain;

    if (!externalUserName && !existingUserName && userId && domainCode) {
      setIsFetchingExternal(true);
      fetch(`/api/external-user?userId=${encodeURIComponent(String(userId))}&domain=${encodeURIComponent(String(domainCode))}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const json = await res.json();
          return json?.success ? (json.user?.userName || json.user?.full_name || null) : null;
        })
        .then((name) => {
          if (name) setExternalUserName(name);
        })
        .catch(() => { })
        .finally(() => setIsFetchingExternal(false));
    }
  }, [selectedLead?.order_creation, selectedLead?.domain, externalUserName]);

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

          {populatedKey === "invoice" &&
            leadData &&
            isInvoice(leadData) && (
              <>
                <Field label="First Name" value={leadData?.firstName} />
                <Field label="Last Name" value={leadData?.lastName} />
                <Field
                  label="Invoice Number"
                  value={
                    leadData?.hostedUrl ? (
                      <a
                        href={leadData.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline hover:text-blue-800"
                      >
                        {leadData?.invoiceNumber}
                      </a>
                    ) : (
                      leadData?.invoiceNumber
                    )
                  }
                />
                <Field label="Email" value={leadData?.email} />
                <Field label="Invoice Status" value={leadData?.status} />
                <Field label="Invoice Amount" value={leadData?.totalPrice} />
                <Field label="Invoice Due Date" value={leadData?.dueDate} />
                <Field label="Invoice Agent Name" value={leadData?.agentName} />
              </>
            )}

          {(populatedKey === "order_creation" ||
            populatedKey === "abandoned_cart") &&
            leadData &&
            isOrderCreation(leadData) && (
              <>
                <Field
                  label="Full Name"
                  value={`${leadData?.firstName ?? ""} ${leadData?.lastName ?? ""
                    }`}
                />
                {/* <Field label="Last Name" value={leadData?.lastName} /> */}
                <Field label="Order Id" value={leadData?.order_id} />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact No" value={leadData?.contactNo} />
                {populatedKey === "order_creation" && (
                  <Field
                    label="User Name"
                    value={
                      (isOrderCreation(leadData) && leadData.user && (leadData.user.userName || leadData.user.full_name)) ||
                      externalUserName ||
                      (isFetchingExternal ? "Loading..." : "N/A")
                    }
                  />
                )}
                <Field label="Address" value={leadData?.address} />
                <Field label="State" value={getStateName(leadData?.state)} />
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
                  value={`${leadData?.firstName ?? ""} ${leadData?.lastName ?? ""
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

          {populatedKey === "custom_lead" &&
            leadData &&
            isCustomLead(leadData) && (
              <>
                <Field
                  label="Full Name"
                  value={`${leadData?.firstName ?? ""} ${leadData?.lastName ?? ""
                    }`}
                />
                <Field label="Email" value={leadData?.email} />
                <Field label="Contact Number" value={leadData?.contactNo} />
                <Field label="Support Type" value={leadData?.supportType} />
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

function isInvoice(data: LeadData): data is IInvoice {
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

function isCustomLead(data: LeadData): data is CustomLead {
  return (
    data !== null &&
    typeof data === "object" &&
    "firstName" in data &&
    "supportType" in data
  );
}
