export const sendServerError = (res, error, context) => {
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
};
