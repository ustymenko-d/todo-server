export const expectThrows = async (fn: () => Promise<unknown>) => {
  await expect(fn()).rejects.toThrow('Error');
};
