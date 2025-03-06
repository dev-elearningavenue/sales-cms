import * as React from "react";
import { ILead } from "@/types/leads";
import { Field } from "./Customer";
import { OrderCreation } from "@/types/customer";

interface CourseInfoProps {
  selectedLead: ILead;
}

const CourseInfo: React.FC<CourseInfoProps> = ({ selectedLead }) => {
  if (!isOrderCreation(selectedLead)) {
    return <p className="text-gray-500">No course information available.</p>;
  }

  const orderLead = selectedLead as OrderCreation;
  return (
    <>
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Courses</h4>
        {orderLead.items?.length > 0 ? (
          orderLead.items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 mb-2 border border-gray-200 rounded-md"
            >
              <Field label="Course Title" value={item.title} />
              <Field label="Price" value={String(item.price)} />
              <Field label="Quantity" value={String(item.quantity)} />
              {/* Add more fields as needed, e.g. item.category, item.discount, etc. */}
            </div>
          ))
        ) : (
          <p className="text-gray-500">No items found.</p>
        )}
      </div>
    </>
  );
};

function isOrderCreation(data: any): data is OrderCreation {
  return data && typeof data === "object" && "items" in data;
}

export default CourseInfo;
