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

  // console.log("CourseInfo - Order Lead: ", orderLead);

  if (!orderLead || !Array.isArray(orderLead.items)) {
    console.log("CourseInfo - No valid order data found");
    return <h1 className="text-gray-500">No course information available.</h1>;
  }

  return (
    <>
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-800">Courses</h4>
          {Array.isArray(orderLead?.items) && orderLead.items.length > 0 && (
            <span className="text-sm font-semibold text-gray-700">
              Total Price: ${orderLead.total}
              {/* orderLead.items
                  .reduce(
                    (sum: number, item: OrderItem) =>
                      sum + item.price * (item.quantity || 1),
                    0
                  )
                  .toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  } */}
            </span>
          )}
        </div>
        {Array.isArray(orderLead?.items) && orderLead.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Course Title
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderLead.items.map((item: OrderItem, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {item.title}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {item.price}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No items found.</p>
        )}
      </div>
    </>
  );
};

export default CourseInfo;
