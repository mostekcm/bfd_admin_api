import _ from 'lodash';
import logger from '../logger';

export const lineItemCost = lineItem => parseFloat(lineItem.quantity) * parseFloat(lineItem.cpu) * parseFloat(lineItem.size);

export const testerCost = lineItem => (lineItem.tester.quantity ? parseFloat(lineItem.tester.quantity) * parseFloat(lineItem.tester.cpu) : 0);

export const displayCost = displayItem => parseFloat(displayItem.quantity) * parseFloat(displayItem.cost);

export const roundToNearestPenny = amount => (typeof amount === 'number' ? Math.round(amount * 100.0) / 100.0 : amount);

const getPaidCommission = commissions => (commissions ? _.sumBy(commissions, c => c.paidAmount) : 0);

export const getCommissionInfo = (order, commissionBase) => {
  /* Default is 0.15% commission */
  let commissionMultiplier = 0.15;
  /* If Jes is the sales rep, commission goes to 0 unless "On the Road" is the show, then set to 7 */
  if (order.salesRep.name === 'Jes Mostek') {
    commissionMultiplier = order.show.name === 'Reorder' ? 0.07 : 0;
  }

  const commission = commissionBase * commissionMultiplier;
  const jes = (commissionBase * 0.2) - commission;

  /* Patch old orders for commission */
  if (order.commissions && order.commissions.length >= 1) {
    order.commissions.forEach((commissionInfo) => {
      if (commissionInfo.payee === 'max' && commissionInfo.paidAmount === undefined) {
        commissionInfo.paidAmount = commission;
      }
    });
  }

  const commissionIndex =
    _(order.commissions || [])
      .groupBy(commissionInfo => commissionInfo.payee)
      .value();

  const commissionInfo = [{
    payee: 'jes',
    due: jes - getPaidCommission(commissionIndex.jes),
    paid: getPaidCommission(commissionIndex.jes),
    multiplier: 0.2 - commissionMultiplier
  }];

  if (commissionMultiplier > 0) {
    commissionInfo.push({
      payee: 'max',
      due: commission - getPaidCommission(commissionIndex.max),
      paid: getPaidCommission(commissionIndex.max),
      multiplier: commissionMultiplier
    });
  }

  commissionInfo.forEach(info =>
    Object.keys(info).forEach((key) => {
      if (info[key]) info[key] = roundToNearestPenny(info[key]);
    }));

  return commissionInfo;
};

const findCase = (casesIndex, productName, size) =>
  _.filter(casesIndex[productName], caseInfo => caseInfo.sku.size === size)[0];

const findDisplay = (displays, name) =>
  _.filter(displays, display => display.name === name)[0];

const lineItemWeight = (item, casesIndex) => {
  const caseInfo = findCase(casesIndex, item.sku.product.name, item.sku.size);
  if (!caseInfo) {
    logger.warn(`Missing weight for case for (${item.sku.product.name}) (${item.sku.size})`);
    return -1000;
  }
  const weight = caseInfo.sku.weight * item.quantity * item.size;
  if (item.tester.quantity && item.tester.quantity > 0) return weight + (item.tester.quantity * caseInfo.tester.weight);
  return weight;
};

const displayWeight = (item, displays, casesIndex) => {
  let weight = findDisplay(displays, item.name).weight * item.quantity;

  item.offsetMerch.forEach((offsetMerchItem) => {
    const lineItemInfo = {
      sku: { product: { name: offsetMerchItem.sku.product.name }, size: offsetMerchItem.sku.size },
      quantity: parseFloat(offsetMerchItem.quantity),
      size: 1,
      tester: {}
    };
    weight += lineItemWeight(lineItemInfo, casesIndex);
  });

  return weight;
};


export const orderTotals = (order, casesIndex, displays) => {
  let weight = 0;

  let totalItem = 0.0;
  let totalTester = 0.0;
  let totalDisplay = 0.0;

  order.lineItems.forEach((item) => {
    totalItem += lineItemCost(item);
    totalTester += testerCost(item);
    weight += lineItemWeight(item, casesIndex);
  });

  order.displayItems.forEach((item) => {
    totalDisplay += displayCost(item);
    weight += displayWeight(item, displays, casesIndex);
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
    weight,
    owed: totalOwed,
    item: totalItem,
    tester: totalTester,
    display: totalDisplay,
    product: totalProduct,
    totalPaid,
    discount,
    commissionBase,
    commissionInfo,
    shippingAndHandling: shippingAndHandling
  };

  Object.keys(totals).forEach((key) => {
    if (key !== 'commissionInfo' && totals[key]) totals[key] = roundToNearestPenny(totals[key]);
  });

  return totals;
};
