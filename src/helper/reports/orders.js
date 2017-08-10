import _ from 'lodash';
import Promise from 'bluebird';

import logger from '../../logger';

const addLineItemLabelUse = (labelIndex, labelUse, lineItemInfo) => {
  const productKey = `${lineItemInfo.productName},${lineItemInfo.skuSize}`;

  const productLabelUses = labelUse[productKey];

  if (!productLabelUses) {
    logger.warn(`Couldn't find label use for ${productKey}`);
    return;
  }

  productLabelUses.forEach((productLabelUse) => {
    const labelKey = productLabelUse.labelInfo.labelKey;

    if (!(labelKey in labelIndex)) labelIndex[labelKey] = {};
    const specificLabelIndex = labelIndex[labelKey];

    const varietyItem = lineItemInfo.variety.length > 0 ? `,${lineItemInfo.variety}` : '';
    const location = productLabelUse.location;
    const productVarietyKey = `${productKey}${varietyItem},${location}`;

    let pdfLink = productLabelUse.pdf;
    if (pdfLink.indexOf('|') >= 0) {
      const pdfLinks = pdfLink.split(';');
      pdfLink = '';
      pdfLinks.forEach((pdfLinkInstance) => {
        const parts = pdfLinkInstance.split('|');
        if (parts[0] === lineItemInfo.variety) {
          pdfLink = parts[1];
        }
      });
    }

    if (!(productVarietyKey in specificLabelIndex)) {
      specificLabelIndex[productVarietyKey] = {
        labelKey: labelKey,
        labels: lineItemInfo.quantity,
        labelsPerSheet: productLabelUse.labelInfo.labelsPerSheet,
        needsPrinting: productLabelUse.needsPrinting === 'TRUE',
        pdf: pdfLink
      };
    } else {
      specificLabelIndex[productVarietyKey].labels += lineItemInfo.quantity;
    }
  });
};

const addLineItemToIndex = (skuIndex, labelIndex, labelUse, lineItemInfo) => {
  if (!(lineItemInfo.productName in skuIndex)) skuIndex[lineItemInfo.productName] = {};
  const productIndex = skuIndex[lineItemInfo.productName];

  if (!(lineItemInfo.skuSize in productIndex)) productIndex[lineItemInfo.skuSize] = {};
  const sizeIndex = productIndex[lineItemInfo.skuSize];

  if (!(lineItemInfo.variety in sizeIndex)) {
    sizeIndex[lineItemInfo.variety] = {
      quantity: lineItemInfo.quantity,
      testerQuantity: lineItemInfo.testerQuantity ? lineItemInfo.testerQuantity : 0
    };
  } else {
    sizeIndex[lineItemInfo.variety].quantity += lineItemInfo.quantity;
    sizeIndex[lineItemInfo.variety].testerQuantity += lineItemInfo.testerQuantity ? lineItemInfo.testerQuantity : 0;
  }

  addLineItemLabelUse(labelIndex, labelUse, lineItemInfo);
};

export default (labelUse, orders) => new Promise((resolve) => {
  const labelIndex = {};
  const skuIndex = {};
  const displayItemIndex = {};
  const orderInfo = [];

  orders.forEach((order) => {
    order.lineItems.forEach((lineItem) => {
      const lineItemInfo = {
        productName: lineItem.sku.product.name,
        skuSize: lineItem.sku.size,
        variety: lineItem.sku.variety,
        quantity: Math.round(parseFloat(lineItem.quantity) * parseFloat(lineItem.size))
      };
      if (lineItem.tester.quantity) lineItemInfo.testerQuantity = parseFloat(lineItem.tester.quantity);

      /* add line item to skus */
      addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo);
    });

    order.displayItems.forEach((displayItem) => {
      /* Add display item to index */
      if (!(displayItem.name in displayItemIndex)) displayItemIndex[displayItem.name] = JSON.parse(JSON.stringify(displayItem));
      else {
        displayItemIndex[displayItem.name].quantity =
          parseFloat(displayItemIndex[displayItem.name].quantity) + parseFloat(displayItem.quantity);
      }

      displayItem.offsetMerch.forEach((offsetMerchItem) => {
        /* add offset merch to skuIndex */
        const lineItemInfo = {
          productName: offsetMerchItem.sku.product.name,
          skuSize: offsetMerchItem.sku.size,
          variety: '',
          quantity: parseFloat(offsetMerchItem.quantity)
        };

        return addLineItemToIndex(skuIndex, labelIndex, labelUse, lineItemInfo);
      });
    });

    orderInfo.push({
      date: order.date,
      targetShipDate: order.targetShipDate,
      show: order.show,
      store: order.store,
      salesRep: order.salesRep
    });
  });

  const labelTotals = [];
  const labelsToPrint = [];

  Object.keys(labelIndex).forEach((labelKey) => {
    let totalSheets = 0;
    Object.keys(labelIndex[labelKey]).forEach((productKey) => {
      const useInfo = labelIndex[labelKey][productKey];
      const sheets = Math.ceil(parseInt(useInfo.labels, 10) / parseInt(useInfo.labelsPerSheet, 10));
      if (useInfo.needsPrinting) {
        labelsToPrint.push({
          labelKey: labelKey,
          productKey: productKey,
          sheets: sheets,
          pdf: useInfo.pdf
        });
      }
      totalSheets += sheets;
    });

    labelTotals.push({
      labelKey: labelKey,
      sheets: totalSheets
    });
  });

  const sortedPrintLabels = _.sortBy(labelsToPrint, ['productKey', 'labelKey']);

  return resolve({
    orders: orderInfo,
    skus: skuIndex,
    displays: displayItemIndex,
    labelTotals: labelTotals,
    labelsToPrint: sortedPrintLabels
  });
});
