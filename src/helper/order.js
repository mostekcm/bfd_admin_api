export const lineItemCost = lineItem => parseFloat(lineItem.quantity) * parseFloat(lineItem.cpu) * parseFloat(lineItem.size);

export const testerCost = lineItem => (lineItem.tester.quantity ? parseFloat(lineItem.tester.quantity) * parseFloat(lineItem.tester.cpu) : 0);

export const displayCost = displayItem => parseFloat(displayItem.quantity) * parseFloat(displayItem.cost);

export const roundToNearestPenny = amount => Math.round(amount * 100.0) / 100.0;

export const getCommissionInfo = (order, commissionBase) => {
  /* Default is 0.15% commission */
  let commissionMultiplier = 0.15;
  console.log('Carlos, commission for order: ', order);
  /* If Jes is the sales rep, commission goes to 0 unless "On the Road" is the show, then set to 7 */
  if (order.salesRep.name === 'Jes Mostek') {
    commissionMultiplier = order.show.name === 'Reorder' ? 0.07 : 0;
  }

  const commission = commissionBase * commissionMultiplier;
  const jes = (commissionBase * 0.2) - commission;
  return {
    commissionDue: order.commissionPaidDate ? 0 : commission,
    commissionPaid: order.commissionPaidDate ? commission : 0,
    dueJes: order.jesPaidDate ? 0 : jes,
    paidJes: order.jesPaidDate ? jes : 0,
    commissionMultiplier,
    jesMultiplier: 0.2 - commissionMultiplier
  };
};

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

  const total = (shippingAndHandling + totalProduct) - (discount);
  const totalOwed = total - totalPaid;
  const commissionBase = totalItem + totalDisplay;
  const commissionInfo = getCommissionInfo(order, commissionBase);
  const totals = {
    total,
    owed: totalOwed,
    item: totalItem,
    tester: totalTester,
    display: totalDisplay,
    product: totalProduct,
    totalPaid,
    discount,
    commissionBase,
    commissionDue: commissionInfo.commissionDue,
    commissionPaid: commissionInfo.commissionPaid,
    commissionMultiplier: commissionInfo.commissionMultiplier,
    dueJes: commissionInfo.dueJes,
    paidJes: commissionInfo.paidJes,
    jesMultiplier: commissionInfo.jesMultiplier,
    shippingAndHandling: shippingAndHandling
  };

  Object.keys(totals).forEach((key) => {
    if (totals[key]) totals[key] = roundToNearestPenny(totals[key]);
  });

  return totals;
};
