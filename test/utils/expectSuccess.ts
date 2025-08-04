export const expectSuccess = <T>(
  message: string,
  subject: T,
  key: 'task' | 'folder',
) => ({
  success: true,
  message,
  [key]: subject,
});
