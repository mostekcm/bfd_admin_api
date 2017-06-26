import { getPossibleJsonValue } from './sheetTools';

const getOffsetMerch = (productName, skuSize, skuMsrp, quantity) => Object({
  sku: {
    product: {
      name: productName
    },
    size: skuSize,
    msrp: skuMsrp
  },
  quantity: quantity
});

const getOffsetMerchFromRow = (productNameInput, skuSizeInput, skuMsrpInput, quantityInput) => {
  const offsetMerch = [];

  const productName = getPossibleJsonValue(productNameInput);
  const skuSize = getPossibleJsonValue(skuSizeInput);
  const skuMsrp = getPossibleJsonValue(skuMsrpInput);
  const quantity = getPossibleJsonValue(quantityInput);

  if (Array.isArray(productName)) {
    let i = 0;
    for (; i < productName.length; i += 1) {
      offsetMerch.push(getOffsetMerch(productName[i], skuSize[i], skuMsrp[i], quantity[i]));
    }
  } else if (productName) {
    offsetMerch.push(getOffsetMerch(productName, skuSize, skuMsrp, quantity));
  }

  return offsetMerch;
};

export default getOffsetMerchFromRow;
