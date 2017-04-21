export const lineItemCost = lineItem => parseFloat(lineItem.quantity) * parseFloat(lineItem.cpu) * parseFloat(lineItem.size);

export const testerCost = lineItem => (lineItem.tester.quantity ? parseFloat(lineItem.tester.quantity) * parseFloat(lineItem.tester.cpu) : 0);

export const displayCost = displayItem => parseFloat(displayItem.quantity) * parseFloat(displayItem.cost);

const roundToNearestPenny = amount => Math.round(amount * 100.0) / 100.0;


export const orderTotals = (order) => {
  let totalItem = 0.0;
  let totalTester = 0.0;
  let totalDisplay = 0.0;

  order.lineItems.forEach((item) => {
    totalItem += lineItemCost(item);
    totalTester += testerCost(item);
  });

  order.displayItems.forEach((item) => {
    totalDisplay += displayCost(item);
  });

  const totalProduct = totalItem + totalTester + totalDisplay;

  const shippingAndHandling = roundToNearestPenny((order.shipping || order.shipping === 0) ? (parseFloat(order.shipping) + (totalProduct * 0.03)) : 0.0);

  const discount = order.discount ? parseFloat(order.discount) : 0.0;

  let totalPaid = 0.0;

  if (order.payments) {
    order.payments.forEach((payment) => {
      totalPaid += parseFloat(payment.amount);
    });
  }

  const totalOwed = (shippingAndHandling + totalProduct) - (discount + totalPaid);
  const commissionBase = totalItem + totalDisplay;
  const commissionDue = commissionBase * 0.15;
  return {
    owed: totalOwed,
    item: totalItem,
    tester: totalTester,
    display: totalDisplay,
    product: totalProduct,
    totalPaid: totalPaid,
    commissionBase: commissionBase,
    commissionDue: commissionDue,
    shippingAndHandling: shippingAndHandling
  };
};
