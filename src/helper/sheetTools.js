export const getPossibleJsonValue = (value) => {
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

export const writePossibleJsonValue = (value) => {
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    return JSON.stringify(value);
  }

  return value;
};
