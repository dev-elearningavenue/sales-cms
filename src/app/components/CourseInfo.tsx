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

interface InvoiceProduct {
  product_id: string;
  name: string;
  price_id: string;
  price: string;
  quantity: number;
  total: number;
}

const CourseInfo: React.FC<CourseInfoProps> = ({ selectedLead }) => {
  //   const orderLead =
  //     selectedLead.order_creation &&
  //     typeof selectedLead.order_creation === "object"
  //       ? (selectedLead.order_creation as OrderCreation)
  //       : null;
  // console.log("CourseInfo - Selected Lead: ", selectedLead);

  // Check for order_creation, abandoned_cart, or invoice data
  let orderLead: OrderCreation | null = null;
  let invoiceData: any = null;
  let products: any[] = [];
  let totalPrice: number = 0;

  if (selectedLead.category === "Invoice" && selectedLead.invoice) {
    // Handle Invoice data
    invoiceData = selectedLead.invoice;

    if (invoiceData.products && Array.isArray(invoiceData.products)) {
      products = invoiceData.products;
      totalPrice = Number(invoiceData.totalPrice) || 0;
    }
  } else {
    // Handle Order data (Order Creation, Abandoned Cart, Unpaid Training)
    orderLead = (selectedLead.order_creation ||
      selectedLead.abandoned_cart) as OrderCreation | null;

    if (orderLead && Array.isArray(orderLead.items)) {
      products = orderLead.items;
      // Try different possible total fields
      totalPrice = Number(orderLead.total) || 0;

      // If total is still 0, calculate from items
      if (totalPrice === 0 && products.length > 0) {
        totalPrice = products.reduce((sum, item) => {
          const itemPrice = Number(item.price) || 0;
          const itemQuantity = Number(item.quantity) || 1;
          return sum + (itemPrice * itemQuantity);
        }, 0);
      }
    }
  }

  if (!products || products.length === 0) {
    return <h1 className="text-gray-500">No course information available.</h1>;
  }

  return (
    <>
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-800">Courses</h4>
          {products.length > 0 && (
            <span className="text-sm font-semibold text-gray-700">
              Total Price: {totalPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
        </div>
        {products.length > 0 ? (
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
                {products.map((item: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {selectedLead.category === "Invoice" ? item.name : item.title}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {selectedLead.category === "Invoice" ? item.price : item.price}
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
