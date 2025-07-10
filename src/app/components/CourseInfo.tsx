import * as React from "react";
import { ILead } from "@/types/leads";
import { Field } from "./Customer";
import { OrderCreation } from "@/types/customer";

interface CourseInfoProps {
  selectedLead: ILead;
}

interface OrderItem {
  title: string;
  price: number;
  quantity: number;
}

const CourseInfo: React.FC<CourseInfoProps> = ({ selectedLead }) => {
  //   const orderLead =
  //     selectedLead.order_creation &&
  //     typeof selectedLead.order_creation === "object"
  //       ? (selectedLead.order_creation as OrderCreation)
  //       : null;
  // console.log("CourseInfo - Selected Lead: ", selectedLead);

  // Check for both order_creation and abandoned_cart
  const orderLead = (selectedLead.order_creation ||
    selectedLead.abandoned_cart) as OrderCreation | null;

  console.log("CourseInfo - Order Lead: ", orderLead);

  if (!orderLead || !Array.isArray(orderLead.items)) {
    console.log("CourseInfo - No valid order data found");
    return <h1 className="text-gray-500">No course information available.</h1>;
  }

  return (
    <>
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-800 mb-2">Courses</h4>
        {orderLead?.items?.length > 0 ? (
          orderLead?.items.map((item: OrderItem, idx: number) => (
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

export default CourseInfo;
