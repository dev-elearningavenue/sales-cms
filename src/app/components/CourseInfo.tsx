import * as React from "react";
import { ILead } from "@/types/leads";
import { OrderCreation } from "@/types/customer";

interface CourseInfoProps {
  selectedLead: ILead;
}

const getPromoCode = (source: any): string => {
  if (!source || typeof source !== "object") return "";
  const raw =
    source.promo_code ?? source.promoCode ?? source.coupon_code ?? source.coupon;
  if (!raw) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    const code = raw.code || raw.promo_code || raw.name || "";
    return typeof code === "string" ? code.trim() : "";
  }
  return "";
};

const parseTotal = (...values: unknown[]): number | null => {
  for (const val of values) {
    if (val === null || val === undefined || val === "") continue;
    const n = Number(val);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const CourseInfo: React.FC<CourseInfoProps> = ({ selectedLead }) => {
  let orderLead: OrderCreation | null = null;
  let invoiceData: any = null;
  let products: any[] = [];
  let totalPrice: number | null = null;
  let promoCode = "";

  if (selectedLead.category === "Invoice" && selectedLead.invoice) {
    invoiceData = selectedLead.invoice;

    if (invoiceData.products && Array.isArray(invoiceData.products)) {
      products = invoiceData.products;
    }
    totalPrice = parseTotal(invoiceData.totalPrice, invoiceData.total);
    promoCode = getPromoCode(invoiceData);
  } else {
    // Order Creation, Abandoned Cart, Unpaid Training
    orderLead = (selectedLead.order_creation ||
      selectedLead.abandoned_cart) as OrderCreation | null;

    if (orderLead && typeof orderLead === "object") {
      if (Array.isArray(orderLead.items)) {
        products = orderLead.items;
      }

      totalPrice = parseTotal(
        (orderLead as any).total,
        (orderLead as any).total_order_price,
        (orderLead as any).price
      );

      // If total missing, calculate from items
      if (totalPrice === null && products.length > 0) {
        totalPrice = products.reduce((sum, item) => {
          const itemPrice = Number(item.price) || 0;
          const itemQuantity = Number(item.quantity) || 1;
          return sum + itemPrice * itemQuantity;
        }, 0);
      }

      promoCode = getPromoCode(orderLead);
    }
  }

  const hasProducts = products.length > 0;
  const hasOrderMeta = Boolean(promoCode) || totalPrice !== null;

  if (!hasProducts && !hasOrderMeta) {
    return <h1 className="text-gray-500">No course information available.</h1>;
  }

  return (
    <>
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
          <h4 className="text-sm font-medium text-gray-800">Courses</h4>
          {hasOrderMeta && (
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
              {promoCode ? (
                <span>
                  Promo Code: <span className="font-bold">{promoCode}</span>
                </span>
              ) : null}
              {totalPrice !== null ? (
                <span>
                  Total Price:{" "}
                  {totalPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              ) : null}
            </div>
          )}
        </div>
        {hasProducts ? (
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
                      {selectedLead.category === "Invoice"
                        ? item.name
                        : item.title}
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
          <p className="text-gray-500 text-sm">No course items in cart.</p>
        )}
      </div>
    </>
  );
};

export default CourseInfo;
